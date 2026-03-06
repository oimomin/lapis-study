-- 既存のデータをクリア（必要な場合）
-- TRUNCATE TABLE public.users CASCADE;

-- 1. ユーザーの作成 (パスワードはすべて 'password123' で生成されたハッシュ値の想定、ここではAuthを介さず直接DBに入れるためダミーデータを入れるか、アプリ側からサインアップした体にするのがベストですが、テスト用の固定IDを作ります)

-- 便宜上、パスワードハッシュは空やダミーにしておきます。（※SupabaseのAuthを使ったログインテストをする場合は、別途画面からサインアップしてこのIDと同じにしてもらうか、SQLでAuth.usersにも入れる必要があります。ここではpublic.usersのみ作成します）

INSERT INTO public.users (id, first_name, last_name, role, grade_level, created_at)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'みのり', '佐藤', 'admin', null, now()),
    ('00000000-0000-0000-0000-000000000002', '太郎', '山田', 'student', '中3', now()),
    ('00000000-0000-0000-0000-000000000003', '花子', '山田', 'parent', null, now()),
    ('00000000-0000-0000-0000-000000000004', '次郎', '鈴木', 'student', '小6', now())
ON CONFLICT (id) DO NOTHING;

-- 2. 家族の紐付け（山田太郎 と 山田花子）
INSERT INTO public.family_connections (parent_id, student_id, created_at)
VALUES 
    ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002')
ON CONFLICT DO NOTHING;

-- 3. システム設定（規約などのデフォルト値）
INSERT INTO public.system_settings (id, contract_template_annual, contract_template_trial, terms_content, privacy_content, updated_at)
VALUES (
    1, 
    '# 指導受託契約書（年間）\n\n【氏名】 {{生徒氏名}}\n【学年】 {{学年}}\n【契約期間】 {{契約期間}}\n\nこれはテスト用の年間契約書です。',
    '# 指導受託契約書（体験）\n\n【氏名】 {{生徒氏名}}\n【学年】 {{学年}}\n【契約期間】 {{契約期間}}\n\nこれはテスト用の体験契約書です。',
    '# システム利用規約\n\n1. 本サービスは...。\n2. 禁止事項は...。',
    '# 個人情報保護に関する同意書\n\n1. 個人情報の取り扱いについて...。',
    now()
)
ON CONFLICT (id) DO UPDATE SET 
    contract_template_annual = EXCLUDED.contract_template_annual,
    contract_template_trial = EXCLUDED.contract_template_trial,
    terms_content = EXCLUDED.terms_content,
    privacy_content = EXCLUDED.privacy_content;

-- 4. お知らせ（Notices）のダミーデータ
INSERT INTO public.notices (title, content, type, target_audience, created_by, is_published, published_at, created_at)
VALUES
    ('春期講習のお知らせ', '3月20日から春期講習が始まります。詳細は別途配布するプリントをご確認ください。', 'event', 'all', '00000000-0000-0000-0000-000000000001', true, now(), now()),
    ('システムメンテナンスのお願い', '今週末の深夜にサーバーメンテナンスを行います。', 'system', 'all', '00000000-0000-0000-0000-000000000001', true, now() - interval '2 days', now() - interval '2 days')
ON CONFLICT DO NOTHING;
