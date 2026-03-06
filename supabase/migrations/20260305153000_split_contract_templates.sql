-- Split contract_template into trial and annual

-- 1. Rename existing column to annual
alter table public.system_settings rename column contract_template to contract_template_annual;

-- 2. Add the new trial column
alter table public.system_settings add column contract_template_trial text not null default '# Lapis Study 指導受託契約書 (1ヶ月お試し体験)

作成日：{{作成日}}

本契約書は、Lapis Study（以下「当方」という）と保護者 {{保護者氏名}} （以下「保護者」という）との間で、生徒 {{生徒氏名}} （以下「生徒」という）に対する学習指導について、以下のとおり契約を締結するものです。

## 第1条（契約の目的）
当方は、保護者の委託を受け、生徒に対し学習指導を行います。

## 第2条（指導内容）
1. 対象学年：{{学年}}
2. 指導科目：{{選択科目}}
3. 指導形態：対面指導を基本とし、オンライン指導は応相談
4. 指導場所：生徒宅
5. 指導時間：1回90分

## 第3条（料金）
1. 入会金：お試し体験のため無料とします。
2. 月謝（税込）：{{月謝}}円
3. システム利用料：月額 {{システム利用料}}円（税込）（月謝に含む）。

## 第4条（契約期間）
{{契約期間}}

## 署名欄
| | 当方：Lapis Study | 保護者 |
|---|---|---|
| 氏名 | Lapis Study | {{保護者氏名}} |
| 日付 | {{作成日}} | {{作成日}} |
| IPアドレス | - | {{IPアドレス}} |
';
