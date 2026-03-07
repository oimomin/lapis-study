import { NextResponse } from 'next/server';
import { WebhookEvent, MessageEvent, TextMessage } from '@line/bot-sdk';
import { getLineClient, sendLineMessage } from '@/lib/line';
import { createAdminClient } from '@/utils/supabase/admin';

export async function POST(request: Request) {
    // 1. Verify Request
    const body = await request.json();
    const events: WebhookEvent[] = body.events;

    if (!events || events.length === 0) {
        return NextResponse.json({ message: 'No events' }, { status: 200 });
    }

    const supabase = createAdminClient();
    const lineClient = getLineClient();

    if (!lineClient) {
        return NextResponse.json({ error: 'LINE Not configured' }, { status: 500 });
    }

    // 2. Process Events
    for (const event of events) {
        if (event.type === 'message' && event.message.type === 'text') {
            const messageEvent = event as MessageEvent;
            const textMessage = messageEvent.message as TextMessage;
            const lineUserId = messageEvent.source.userId;
            const receivedToken = textMessage.text.trim();

            if (!lineUserId) continue;

            // 3. Check if the message is a 6-digit token (A-Z0-9)
            if (/^[A-Z0-9]{6}$/i.test(receivedToken)) {
                try {
                    // Find user by token
                    const { data: user, error: findError } = await supabase
                        .from('users')
                        .select('id, first_name, last_name')
                        .eq('line_link_token', receivedToken.toUpperCase())
                        .single();

                    if (findError || !user) {
                        await sendLineMessage(
                            lineUserId,
                            '❌ 無効なワンタイムパスワードです。\nもう一度システムの設定画面からパスワードを発行してください。'
                        );
                        continue;
                    }

                    // 4. Link the LINE account
                    const { error: updateError } = await supabase
                        .from('users')
                        .update({
                            line_user_id: lineUserId,
                            line_link_token: null // Clear token after successful link
                        })
                        .eq('id', user.id);

                    if (updateError) {
                        console.error('Failed to update line_user_id', updateError);
                        await sendLineMessage(lineUserId, '❌ 連携中にエラーが発生しました。時間を置いて再度お試しください。');
                        continue;
                    }

                    // 5. Success Message
                    await sendLineMessage(
                        lineUserId,
                        `✅ ${user.last_name} ${user.first_name} さん、連携が完了しました！\n今後、システムからのお知らせや通知をこちらでお届けします。`
                    );
                } catch (error) {
                    console.error('LINE Webhook error:', error);
                }
            } else {
                // If they send a normal message or greeting
                await sendLineMessage(lineUserId, 'Lapis Study（ラピススタディ）へようこそ！💎\nシステムの「設定」画面から発行された6桁の連携用パスワードをここに送信すると、通知を受け取れるようになります。');
            }
        }
    }

    // Return 200 OK so LINE knows we received the webhook
    return NextResponse.json({ message: 'Success' }, { status: 200 });
}
