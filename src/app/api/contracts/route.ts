import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const createContractSchema = z.object({
    studentId: z.string().uuid(),
    contractType: z.enum(["trial", "annual"]),
    subjects: z.array(z.string()).min(1),
    monthlyFee: z.number().int().min(0),
    admissionFee: z.number().int().min(0),
    systemFee: z.number().int().min(0),
    parentSignatureName: z.string().min(1),
    parentAddress: z.string().min(1),
    parentPhone: z.string().min(1),
    agreedToTerms: z.literal(true),
    agreedToPrivacy: z.literal(true),
    studentName: z.string().optional()
});

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const validatedData = createContractSchema.parse(body);

        // Check role
        const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
        const isAdmin = profile?.role === 'admin';

        let targetParentId = user.id;
        let studentGradeLevel = "生徒情報をご確認ください";

        if (isAdmin) {
            const { data: connection } = await supabase.from('family_connections').select('parent_id, student:users!family_connections_student_id_fkey(grade_level)').eq('student_id', validatedData.studentId).single();
            if (connection) {
                targetParentId = connection.parent_id;
                // Type assertion since postgrest relationships can be array or object
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const studentData = connection.student as any;
                if (studentData && studentData.grade_level) {
                    studentGradeLevel = studentData.grade_level;
                }
            } else {
                return NextResponse.json({ error: "対象の生徒に紐づく保護者が見つかりません。" }, { status: 400 });
            }
        } else {
            // If parent is submitting, fetch student's grade level directly
            const { data: student } = await supabase.from('users').select('grade_level').eq('id', validatedData.studentId).single();
            if (student && student.grade_level) {
                studentGradeLevel = student.grade_level;
            }
        }

        // Capture IP Address (for signature evidence)
        const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";

        // Fetch current templates to save as snapshots
        const { data: settings } = await supabase
            .from("system_settings")
            .select("contract_template_annual, contract_template_trial, terms_content, privacy_content")
            .eq("id", 1)
            .single();

        let contractSnapshot = "";
        if (validatedData.contractType === 'trial') {
            contractSnapshot = settings?.contract_template_trial || "";
        } else {
            contractSnapshot = settings?.contract_template_annual || "";
        }

        // Process variables
        const today = new Date();
        const formattedDate = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;

        contractSnapshot = contractSnapshot.replace(/\{\{作成日\}\}/g, formattedDate);
        contractSnapshot = contractSnapshot.replace(/\{\{保護者氏名\}\}/g, validatedData.parentSignatureName);
        contractSnapshot = contractSnapshot.replace(/\{\{生徒氏名\}\}/g, validatedData.studentName || "未設定");
        contractSnapshot = contractSnapshot.replace(/\{\{学年\}\}/g, studentGradeLevel);
        contractSnapshot = contractSnapshot.replace(/\{\{選択科目\}\}/g, validatedData.subjects.join("・"));
        contractSnapshot = contractSnapshot.replace(/\{\{入会金\}\}/g, validatedData.admissionFee.toLocaleString());
        contractSnapshot = contractSnapshot.replace(/\{\{月謝\}\}/g, validatedData.monthlyFee.toLocaleString());
        contractSnapshot = contractSnapshot.replace(/\{\{システム利用料\}\}/g, validatedData.systemFee.toLocaleString());
        contractSnapshot = contractSnapshot.replace(/\{\{IPアドレス\}\}/g, ipAddress);

        let contractPeriod = "";
        if (validatedData.contractType === 'trial') {
            contractPeriod = "1. 本契約は1ヶ月間のお試し契約とします。\n2. 本契約は期間満了により終了します（自動更新しません）。\n3. 継続を希望する場合は、期間終了の1ヶ月前までに当方へ申し出てください。継続時は別途1年間契約または進級・卒業まで契約へ切り替わります。";
        } else if (validatedData.contractType === 'annual') {
            contractPeriod = "1. 本契約の期間は1年間とします。\n2. 本契約は、期間満了の1ヶ月前までに双方から更新拒絶の申し出がない場合、同一条件で1年間自動更新します。";
        } else {
            contractPeriod = "1. 本契約の期間は、契約開始日から生徒の進級・卒業（学年・学校段階の終了）まで、または双方が合意した時点までとします。\n2. 進級・卒業等の事由が生じた場合、当該学年・期間の終了をもって本契約は自然終了します。";
        }
        contractSnapshot = contractSnapshot.replace(/\{\{契約期間\}\}/g, contractPeriod);

        const { data: contract, error: dbError } = await supabase
            .from("contracts")
            .insert({
                parent_id: targetParentId,
                student_id: validatedData.studentId,
                contract_type: validatedData.contractType,
                subjects: validatedData.subjects,
                monthly_fee: validatedData.monthlyFee,
                admission_fee: validatedData.admissionFee,
                system_fee: validatedData.systemFee,
                agreed_to_terms: validatedData.agreedToTerms,
                agreed_to_privacy: validatedData.agreedToPrivacy,
                parent_signature_name: validatedData.parentSignatureName,
                ip_address: ipAddress,
                contract_snapshot: contractSnapshot,
                terms_snapshot: settings?.terms_content || "内容が取得できませんでした",
                privacy_snapshot: settings?.privacy_content || "内容が取得できませんでした",
                parent_address: validatedData.parentAddress,
                parent_phone: validatedData.parentPhone,
                status: 'pending' // Default new contracts to pending
            })
            .select()
            .single();

        if (dbError) {
            console.error("Database error creating contract:", dbError);
            return NextResponse.json({ error: `Failed to create contract: ${dbError.message || JSON.stringify(dbError)}` }, { status: 500 });
        }

        return NextResponse.json({ success: true, contract });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Invalid data", details: error.issues }, { status: 400 });
        }
        console.error("Unexpected error in contract creation:", error);
        return NextResponse.json({ error: `Internal server error: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 });
    }
}
