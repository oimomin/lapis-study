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
    agreedToTerms: z.literal(true),
    agreedToPrivacy: z.literal(true)
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

        if (isAdmin) {
            const { data: connection } = await supabase.from('family_connections').select('parent_id').eq('student_id', validatedData.studentId).single();
            if (connection) {
                targetParentId = connection.parent_id;
            } else {
                return NextResponse.json({ error: "対象の生徒に紐づく保護者が見つかりません。" }, { status: 400 });
            }
        }

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
                status: 'pending' // Default new contracts to pending
            })
            .select()
            .single();

        if (dbError) {
            console.error("Database error creating contract:", dbError);
            return NextResponse.json({ error: "Failed to create contract" }, { status: 500 });
        }

        return NextResponse.json({ success: true, contract });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Invalid data", details: error.issues }, { status: 400 });
        }
        console.error("Unexpected error in contract creation:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
