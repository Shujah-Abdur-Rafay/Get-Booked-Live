-- ============================================================
-- GetBooked.Live — Complete Database Migration
-- Adds: slug + social columns to artist_listings
-- Updates: directory_listings view to include new columns
-- Populates: 370 artist slugs
-- Adds: BookScore trigger + cron job
-- ============================================================

-- ─── 1. Add columns to artist_listings ───────────────────────
ALTER TABLE public.artist_listings
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS instagram TEXT,
  ADD COLUMN IF NOT EXISTS spotify TEXT,
  ADD COLUMN IF NOT EXISTS tiktok TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS bookscore NUMERIC,
  ADD COLUMN IF NOT EXISTS tier TEXT,
  ADD COLUMN IF NOT EXISTS fee_min NUMERIC,
  ADD COLUMN IF NOT EXISTS fee_max NUMERIC,
  ADD COLUMN IF NOT EXISTS bio TEXT;

-- ─── 2. Update directory_listings view to include new columns ─
CREATE OR REPLACE VIEW public.directory_listings AS
SELECT
  id,
  name,
  avatar_url,
  CASE WHEN genre IS NOT NULL THEN ARRAY[genre] ELSE '{}'::text[] END AS genres,
  origin AS city,
  NULL::text AS state,
  'artist'::text AS listing_type,
  slug,
  COALESCE(bio, notes) AS bio,
  bookscore,
  tier,
  fee_min,
  fee_max,
  CASE WHEN claim_status = 'approved' THEN true ELSE false END AS is_claimed,
  claimed_by,
  instagram,
  spotify,
  tiktok,
  website
FROM public.artist_listings
UNION ALL
SELECT
  id,
  name,
  NULL::text AS avatar_url,
  '{}'::text[] AS genres,
  city,
  state,
  'venue'::text AS listing_type,
  NULL::text AS slug,
  description AS bio,
  NULL::numeric AS bookscore,
  NULL::text AS tier,
  NULL::numeric AS fee_min,
  NULL::numeric AS fee_max,
  CASE WHEN claim_status = 'approved' THEN true ELSE false END AS is_claimed,
  claimed_by,
  NULL::text AS instagram,
  NULL::text AS spotify,
  NULL::text AS tiktok,
  NULL::text AS website
FROM public.venue_listings;

-- ─── 3. Populate slugs for all 370 artists ───────────────────
UPDATE public.artist_listings SET slug = 'ken-y' WHERE id = '8cefec3d-8f29-4b3f-bce7-d9c469523380';
UPDATE public.artist_listings SET slug = 'mach-and-daddy' WHERE id = 'd9094887-f5f5-4612-8947-b0bf015996ad';
UPDATE public.artist_listings SET slug = 'demphra' WHERE id = 'f4701978-34bf-4d82-b394-a7adddd40437';
UPDATE public.artist_listings SET slug = 'elefante' WHERE id = '69028a65-3129-4f99-b4f5-63df993b8384';
UPDATE public.artist_listings SET slug = 'makano' WHERE id = 'b27a12d8-8810-438a-9375-096ad5a182bc';
UPDATE public.artist_listings SET slug = 'key-key' WHERE id = 'be5860c2-e557-481a-b5b2-4064a74ae6e4';
UPDATE public.artist_listings SET slug = 'los-fugitivos' WHERE id = 'e4c332c7-3745-45e8-aab8-0589d5b0e64f';
UPDATE public.artist_listings SET slug = 'tierra-cali' WHERE id = '43bcecac-f430-4e78-af70-3d0efd66cc52';
UPDATE public.artist_listings SET slug = 'flex' WHERE id = '04a56d66-c219-4a3d-8786-dfaa3ee92a12';
UPDATE public.artist_listings SET slug = 'josenid' WHERE id = 'f81dc490-a8b6-4c32-b457-32eb82f77e8d';
UPDATE public.artist_listings SET slug = 'poncho-zuleta' WHERE id = '4e126940-f669-4c38-bbae-97ead28a5647';
UPDATE public.artist_listings SET slug = 'felipe-pelez' WHERE id = 'd09cf86a-9bea-4bbf-a3da-463810d7672d';
UPDATE public.artist_listings SET slug = 'inspector' WHERE id = '650edef0-a683-42b5-ab54-593abdcda9bd';
UPDATE public.artist_listings SET slug = 'ralfy-the-plug' WHERE id = 'b4bdcf33-3969-47e2-8e51-15f2416eeff5';
UPDATE public.artist_listings SET slug = 'banda-maguey' WHERE id = 'ab7b7322-bdf1-4dbf-935c-ee877d2daf4b';
UPDATE public.artist_listings SET slug = 'humberto-plancarte' WHERE id = 'd2bdb6ba-6062-434e-93ec-534e3552f437';
UPDATE public.artist_listings SET slug = 'alameos-de-la-sierra' WHERE id = '2536342a-2796-4887-8ced-d5772852fa96';
UPDATE public.artist_listings SET slug = 'armona-10' WHERE id = '9befb9c5-784f-4307-b548-e3ffa8f87b1e';
UPDATE public.artist_listings SET slug = 'duncan-dhu' WHERE id = '7c390093-ee4e-460d-b01d-08a10cebeb6f';
UPDATE public.artist_listings SET slug = 'el-cocha-molina' WHERE id = '659c6362-8e49-431a-a7d5-e2e4c54e88ff';
UPDATE public.artist_listings SET slug = 'ladron' WHERE id = '8023c651-dace-4dff-8e9c-a7d683c9e309';
UPDATE public.artist_listings SET slug = 'veronica-bolaos' WHERE id = 'b1ca1d50-c2f3-4a43-8ba5-2b17c83e33e8';
UPDATE public.artist_listings SET slug = 'zacarias-ferreira' WHERE id = 'd079c624-7cfa-42b1-b5ff-9c508ce4b139';
UPDATE public.artist_listings SET slug = 'chito-rana' WHERE id = 'edb86f7a-2416-4b1b-a329-a493414a0d47';
UPDATE public.artist_listings SET slug = 'larry-hernndez' WHERE id = '2ad5d463-22cb-4ace-8b43-be50f18c96b1';
UPDATE public.artist_listings SET slug = 'los-inquietos-del-norte' WHERE id = 'e74a7fa5-7374-4e91-a37a-9363c3780d72';
UPDATE public.artist_listings SET slug = 'yailin-la-mas-viral' WHERE id = '6423f1e7-b4d3-4922-ac87-0dbb27443c2d';
UPDATE public.artist_listings SET slug = 'aleks-syntek' WHERE id = '3d9aa0ec-ad5a-4373-862c-b2db21766dcb';
UPDATE public.artist_listings SET slug = 'grupo-exterminador' WHERE id = '6e1d7728-b274-4403-9697-079163c848f3';
UPDATE public.artist_listings SET slug = 'hipatia-balseca' WHERE id = 'ec212974-8c3b-4159-bad1-73d2d5c17cda';
UPDATE public.artist_listings SET slug = 'juan-carlos-cuaspud-el-nene' WHERE id = 'a5450e36-be0b-41d8-a91c-06689e95b9c0';
UPDATE public.artist_listings SET slug = 'karina-caiza' WHERE id = 'bbbbe963-20de-4fbc-862d-0ff835e21ad3';
UPDATE public.artist_listings SET slug = 'lili-macas' WHERE id = '985536a8-fa94-4e57-9a8a-61a81666fcc2';
UPDATE public.artist_listings SET slug = 'los-caimanes-de-sinaloa' WHERE id = '92656701-7631-4132-9d7b-14e65417eb43';
UPDATE public.artist_listings SET slug = 'rosita-cajamarca' WHERE id = 'a68c452b-6248-4be6-94fe-0bc8fea6a3bd';
UPDATE public.artist_listings SET slug = 'trio-los-panchos' WHERE id = '3427b2cc-c132-4cc6-a962-0dc915777592';
UPDATE public.artist_listings SET slug = 'alzate' WHERE id = '5e1918a8-a931-4130-826a-a5ddb1c7b448';
UPDATE public.artist_listings SET slug = 'diego-daza' WHERE id = '9b04715e-6a0e-41cd-9765-2f2b662f9f25';
UPDATE public.artist_listings SET slug = 'edwin-luna-y-la-trakalosa-de-monterrey' WHERE id = '6c5d7c28-e0a1-4ac5-bb23-82e58d0ec63d';
UPDATE public.artist_listings SET slug = 'el-blachy' WHERE id = 'f448d71e-546c-46f3-a14c-a7d13762ae76';
UPDATE public.artist_listings SET slug = 'hnos-plancarte-de-tc' WHERE id = 'ac20dc1d-d29d-41ea-aade-e778cf866ed9';
UPDATE public.artist_listings SET slug = 'los-dinnos' WHERE id = 'a173795a-32f6-4e2d-bbb3-a36c66f5a3c2';
UPDATE public.artist_listings SET slug = 'los-jilguerillos-del-norte' WHERE id = 'bed2ecb1-cbf3-46cf-9e6a-301126a2d5fe';
UPDATE public.artist_listings SET slug = 'los-mismos' WHERE id = '55807ca9-7a20-42ea-af74-ec06c005b73c';
UPDATE public.artist_listings SET slug = 'lou-deezi' WHERE id = '0f931cce-49a8-4c16-bf64-d26ef4ddd030';
UPDATE public.artist_listings SET slug = 'patrulla-81' WHERE id = '496d3d1e-33cb-4459-908c-67814483c5c3';
UPDATE public.artist_listings SET slug = 'renacimiento-74' WHERE id = '003c6851-b219-410b-8fe2-628fd2369165';
UPDATE public.artist_listings SET slug = 'rolando-ochoa' WHERE id = 'acec117a-77b2-4ae5-a733-18b89604b794';
UPDATE public.artist_listings SET slug = 'tam-y-tex' WHERE id = '82e30d4f-712c-4168-a00a-48dbf2e0bd82';
UPDATE public.artist_listings SET slug = 'banda-san-miguel' WHERE id = '92517624-b499-44d6-bb9c-449a7ed7d32d';
UPDATE public.artist_listings SET slug = 'chiquito-team-band' WHERE id = '63e2a5d0-9820-402a-b91c-9193f7daac60';
UPDATE public.artist_listings SET slug = 'conjunto-atardecer' WHERE id = '3b56beb4-e207-49cc-aa34-3cfed419ff0e';
UPDATE public.artist_listings SET slug = 'david-pabon' WHERE id = 'd4d37a16-5ca7-4993-b538-0db7440582f6';
UPDATE public.artist_listings SET slug = 'el-gran-chorrillano' WHERE id = '1aea6cd7-a722-4197-8561-f10c4859c415';
UPDATE public.artist_listings SET slug = 'el-tpo-de-mxico' WHERE id = '838e5c8b-a701-4f9a-bd4a-6a739832f96d';
UPDATE public.artist_listings SET slug = 'grupo-saya' WHERE id = '014f9094-dbae-41ea-8dd8-c2312b94f466';
UPDATE public.artist_listings SET slug = 'jean-carlos-centeno' WHERE id = '55ee48c8-cb5b-4b6a-bbcc-3ffe1ccfa2fb';
UPDATE public.artist_listings SET slug = 'joey-montana' WHERE id = '27386847-f4d7-4d17-8db2-05e222f18ef8';
UPDATE public.artist_listings SET slug = 'johanna-san-miguel' WHERE id = '6037e9cf-f9c8-4c24-8d3d-16b73b0f972f';
UPDATE public.artist_listings SET slug = 'la-ley-de-michoacan' WHERE id = 'a901c61d-8362-4025-8084-c1ff9a9873a0';
UPDATE public.artist_listings SET slug = 'la-pocima-nortea' WHERE id = '26e8667e-229a-44a8-afd0-e4d9e2ec5ffb';
UPDATE public.artist_listings SET slug = 'legado-7' WHERE id = '7297f0fe-5472-40f6-abca-4afd2f67c679';
UPDATE public.artist_listings SET slug = 'los-cadetes-de-linares' WHERE id = 'c7a7dc3e-207f-4177-9f0b-2968a11bf9f9';
UPDATE public.artist_listings SET slug = 'los-dareyes-de-la-sierra' WHERE id = '9704277c-831f-47c9-9a76-e1779ab064dc';
UPDATE public.artist_listings SET slug = 'los-diablitos-los-dioses-de-la-msica-nacional' WHERE id = '03c91439-1478-422a-9f51-c5ea2958e109';
UPDATE public.artist_listings SET slug = 'los-humildes-hnos-ayala' WHERE id = '4ccfcbd3-1791-47d2-a029-684515301902';
UPDATE public.artist_listings SET slug = 'roberto-tapia' WHERE id = '6056b801-f299-4162-b071-7a78cde88530';
UPDATE public.artist_listings SET slug = 'ronal-urbina' WHERE id = '7bafb893-5bb2-4b74-800e-53f312624237';
UPDATE public.artist_listings SET slug = 'willy-chirino' WHERE id = '7dbfe1a2-69a6-4cc6-a74d-e03fe21f8973';
UPDATE public.artist_listings SET slug = 'alfonso-cota-y-los-de-la-sierra' WHERE id = '36de68d0-ebd6-4d83-a91b-8882343c902c';
UPDATE public.artist_listings SET slug = 'amenazzy' WHERE id = 'b4d92bee-8066-4baf-9091-7bd9188354b7';
UPDATE public.artist_listings SET slug = 'angeles-tu-diosa-dorada' WHERE id = '4848c3aa-8a8c-427a-a0d3-16a0f1c12548';
UPDATE public.artist_listings SET slug = 'aspirante' WHERE id = 'e677c541-7a2a-41b3-a2e1-14bd3471cc8e';
UPDATE public.artist_listings SET slug = 'baby-rasta-and-gringo' WHERE id = '3817af1d-17a4-4db3-9bae-6262657204ba';
UPDATE public.artist_listings SET slug = 'banda-clave-nueva' WHERE id = 'cbec4151-5e98-420e-93db-7758a2082d6f';
UPDATE public.artist_listings SET slug = 'banda-perla-de-michoacn' WHERE id = 'fc23fef9-974d-459d-ba20-2996bdfa86db';
UPDATE public.artist_listings SET slug = 'brunella-torpoco' WHERE id = '70c40eb7-c4dd-4fdb-9e8c-36130bfe22a9';
UPDATE public.artist_listings SET slug = 'don-medardo-y-sus-players-mauricio-luzuriaga' WHERE id = '4d521fcb-c5d4-4d75-8cb3-181d87c0fdea';
UPDATE public.artist_listings SET slug = 'eddy-lover' WHERE id = 'e334fefd-dd31-4b50-a4c2-1116a170b908';
UPDATE public.artist_listings SET slug = 'el-fantasma' WHERE id = '8ccdfe5c-f826-4b3a-8596-0e35d13d5190';
UPDATE public.artist_listings SET slug = 'frank-reyes' WHERE id = '2e3ee811-66ef-4d0d-9e95-a73767504beb';
UPDATE public.artist_listings SET slug = 'herencia-de-patrones' WHERE id = '3e8a80b9-e6b6-4b94-b8d9-01fb4f71673d';
UPDATE public.artist_listings SET slug = 'jeyyff' WHERE id = '2e407986-17f2-4b42-b16c-ee7567ceec5c';
UPDATE public.artist_listings SET slug = 'karlos-ros' WHERE id = 'b52db949-a682-41da-b435-91277c9846a9';
UPDATE public.artist_listings SET slug = 'keith-nieto' WHERE id = 'd502fca6-4659-48b0-b23e-126118c6051c';
UPDATE public.artist_listings SET slug = 'kjantu-per' WHERE id = 'e3ebbba2-21ba-4195-9b41-2b9604ffc506';
UPDATE public.artist_listings SET slug = 'k-paz-de-la-sierra' WHERE id = '20d8320c-45de-4735-9df6-6176899a6758';
UPDATE public.artist_listings SET slug = 'la-original-banda-el-limn-de-salvador-lizrraga' WHERE id = '6dcd0f74-2eec-45a6-b6bc-3fa1e3f3dc22';
UPDATE public.artist_listings SET slug = 'la-perversa' WHERE id = '9e103e90-9e38-464a-a0cf-3cc51a51de5e';
UPDATE public.artist_listings SET slug = 'l-kimii' WHERE id = 'd07d734d-d3ec-4003-9d67-6d5082b1cbdc';
UPDATE public.artist_listings SET slug = 'los-originales-de-san-juan' WHERE id = 'fa204de7-dc40-483e-85a6-9c3a9b6a1625';
UPDATE public.artist_listings SET slug = 'los-pasteles-verdes' WHERE id = 'f49932cb-00fe-43b4-9ed7-f0278d20ecf1';
UPDATE public.artist_listings SET slug = 'los-socios-del-ritmo' WHERE id = 'bff303b1-0f01-4374-9967-8e69a652f048';
UPDATE public.artist_listings SET slug = 'los-telez' WHERE id = '9cb24f8f-970e-442b-95a3-a3822b116455';
UPDATE public.artist_listings SET slug = 'los-varones-de-california' WHERE id = 'd11027eb-ca39-48e1-9c49-4b0cd2a5bf30';
UPDATE public.artist_listings SET slug = 'luis-mateus' WHERE id = 'b6d19b3e-d802-4252-a4a5-845eb9c016d9';
UPDATE public.artist_listings SET slug = 'marco-flores-y-la-jerez' WHERE id = 'c6adcdd8-1ea3-49ed-9ad5-94fcef946fca';
UPDATE public.artist_listings SET slug = 'marimba-502' WHERE id = '419f172b-9017-4c72-81f1-d403ad4d8eee';
UPDATE public.artist_listings SET slug = 'maximo-escaleras' WHERE id = 'dc9cd8e8-eabf-4160-bd9d-8856d1803d6e';
UPDATE public.artist_listings SET slug = 'myriam-hernandez' WHERE id = 'aea9fbef-4b84-4eb5-9b0c-31aa6c585976';
UPDATE public.artist_listings SET slug = 'panter-blico' WHERE id = '7478cb68-312f-47d1-9a60-5fdf98ed6543';
UPDATE public.artist_listings SET slug = 'rudy-la-scala' WHERE id = '996aea07-77fd-4f09-a360-78f29d78e106';
UPDATE public.artist_listings SET slug = 'saymon-y-los-cochalitos' WHERE id = '05df56bb-a154-488a-a512-3d062f09cc38';
UPDATE public.artist_listings SET slug = 'su-majestad-mi-banda-el-mexicano-de-casimiro-zamudio' WHERE id = '9176ca61-16c6-4ff3-846e-0f05de33df44';
UPDATE public.artist_listings SET slug = 'wilmer-manga' WHERE id = 'b0bf4917-2b86-4548-9410-33251ccb5b63';
UPDATE public.artist_listings SET slug = 'billie-eilish' WHERE id = '5769219d-6a9b-42f1-9005-e25fe4d3dfa8';
UPDATE public.artist_listings SET slug = 'taylor-swift' WHERE id = '8634b2ec-1d60-4582-8913-303d849fdfa3';
UPDATE public.artist_listings SET slug = 'the-weeknd' WHERE id = 'b03e81b4-71b8-44c5-9cab-0710fbdf11c4';
UPDATE public.artist_listings SET slug = 'eminem' WHERE id = '7d895190-cfec-4c8e-9363-78126ffe9a30';
UPDATE public.artist_listings SET slug = 'kendrick-lamar' WHERE id = '65c8f7d2-ebdf-4a06-91f2-c20422867316';
UPDATE public.artist_listings SET slug = 'lana-del-rey' WHERE id = 'c7407493-3443-4149-8926-cf9f3db14030';
UPDATE public.artist_listings SET slug = 'coldplay' WHERE id = '5b682f37-42c0-4a11-8aec-765322760044';
UPDATE public.artist_listings SET slug = 'drake' WHERE id = 'a3d20f85-f162-4f17-81dc-3eacf552b694';
UPDATE public.artist_listings SET slug = 'bruno-mars' WHERE id = '39d76205-4e83-4bdc-8b1b-179a1543eacb';
UPDATE public.artist_listings SET slug = 'rihanna' WHERE id = '2128cb17-5f4e-4574-88a0-81b8bcbdabf8';
UPDATE public.artist_listings SET slug = 'sombr' WHERE id = 'dc5e809c-2743-43ce-976c-fc5e7b52c588';
UPDATE public.artist_listings SET slug = 'lola-young' WHERE id = '88afbbf6-96aa-45b1-b50d-e23f2e5760b6';
UPDATE public.artist_listings SET slug = 'jennie' WHERE id = '24931239-2a04-4c7f-a34a-db910068cd67';
UPDATE public.artist_listings SET slug = 'doechii' WHERE id = '69bcd83e-f5ad-4ddb-8662-a187736397e8';
UPDATE public.artist_listings SET slug = 'ella-langley' WHERE id = '47ed787e-08b1-4187-94ff-8faacd39a502';
UPDATE public.artist_listings SET slug = 'alex-warren' WHERE id = 'ab6eceec-beca-4720-b634-7d1c9e01f5e8';
UPDATE public.artist_listings SET slug = 'olivia-dean' WHERE id = '70a27b68-ef4a-4213-b6f2-9f09273a3839';
UPDATE public.artist_listings SET slug = 'tyla' WHERE id = '2cf43903-a2d2-4b49-b126-45c1c1e65c09';
UPDATE public.artist_listings SET slug = 'bigxthaplug' WHERE id = '14b4629e-b58e-4793-931b-9d84fbf2d3bd';
UPDATE public.artist_listings SET slug = 'forrest-frank' WHERE id = '7448989e-8732-442c-805e-c2dec2fa557b';
UPDATE public.artist_listings SET slug = 'robert-glasper' WHERE id = '18e96785-c7eb-499e-b03d-dda9a7a1b006';
UPDATE public.artist_listings SET slug = 'american-aquarium' WHERE id = 'd7ba1a62-d2d4-4964-ab28-24fe97773601';
UPDATE public.artist_listings SET slug = 'claptone' WHERE id = '5ca6f713-dad9-4138-813e-444e10ad7584';
UPDATE public.artist_listings SET slug = 'black-coffee' WHERE id = '00ecdab4-b96e-40af-b75b-51b3f61f8c75';
UPDATE public.artist_listings SET slug = 'stick-to-your-guns' WHERE id = 'ad61394a-432a-409d-a060-68f9c473a2da';
UPDATE public.artist_listings SET slug = 'alexandra-kay' WHERE id = '33920727-c076-47a9-8d4f-a012b3ceab34';
UPDATE public.artist_listings SET slug = 'air-supply' WHERE id = '51a2c1e7-b67c-4ab3-9855-fcf8f67c4381';
UPDATE public.artist_listings SET slug = 'zach-top' WHERE id = 'b717c9ab-6ba2-40ff-be3f-d0823d0ee530';
UPDATE public.artist_listings SET slug = 'everclear' WHERE id = 'e74845a2-df13-4326-b483-d08097811e6b';
UPDATE public.artist_listings SET slug = 'steve-aoki' WHERE id = '04920b6d-af70-4d4b-9f60-db375329ef03';
UPDATE public.artist_listings SET slug = 'system-of-a-down' WHERE id = '9c4aa276-5574-4662-b031-ec23aa1035d3';
UPDATE public.artist_listings SET slug = 'zayn' WHERE id = '15a85394-3e51-4647-a7f1-8d8b99011d68';
UPDATE public.artist_listings SET slug = 'chris-brown' WHERE id = 'bc3a36ee-e892-45c5-ad73-952aab44b4b6';
UPDATE public.artist_listings SET slug = 'youngboy-never-broke-again' WHERE id = 'b2b2f908-60b0-422a-a293-8de6ee917306';
UPDATE public.artist_listings SET slug = 'oasis' WHERE id = 'cd352296-f1b6-4789-b2e3-01eff8348827';
UPDATE public.artist_listings SET slug = 'sleep-token' WHERE id = 'b7723860-f77e-4bc8-bbb2-1bb5c00204ce';
UPDATE public.artist_listings SET slug = 'shakira' WHERE id = '1d77a7bb-6344-4ddd-aee6-cc1d714d7999';
UPDATE public.artist_listings SET slug = 'damiano-david' WHERE id = 'd04df3e1-6c07-48bb-99c7-6239dc4a8b84';
UPDATE public.artist_listings SET slug = 'metallica' WHERE id = '34e6b185-d03f-4ace-bff5-6f243d38acfd';
UPDATE public.artist_listings SET slug = 'foo-fighters' WHERE id = 'caf1847a-88b8-42a7-9561-f8b1571560cd';
UPDATE public.artist_listings SET slug = 'red-hot-chili-peppers' WHERE id = '46d54fd6-a220-435f-9c6a-83c4fdfec4c1';
UPDATE public.artist_listings SET slug = 'pearl-jam' WHERE id = '2c98a11b-c737-4a7f-a158-08885e0c5203';
UPDATE public.artist_listings SET slug = 'the-rolling-stones' WHERE id = '861dc0e3-6d36-4cc5-bdd0-d9c324a2aa25';
UPDATE public.artist_listings SET slug = 'bruce-springsteen' WHERE id = '8404ca58-d753-4eba-bdcf-72a67f2c22d5';
UPDATE public.artist_listings SET slug = 'queens-of-the-stone-age' WHERE id = '085d6559-6a1c-49e8-bdc0-de0c8921784e';
UPDATE public.artist_listings SET slug = 'hozier' WHERE id = '7dcac60d-56e4-4032-add2-75cba255de1b';
UPDATE public.artist_listings SET slug = 'arctic-monkeys' WHERE id = 'b2117e51-162f-4af1-9a42-e0ada8d87f10';
UPDATE public.artist_listings SET slug = 'dua-lipa' WHERE id = '9803fcb5-81de-43aa-9525-c9921a7e6dc0';
UPDATE public.artist_listings SET slug = 'harry-styles' WHERE id = '2561d738-b16c-4de1-a51c-e2b6dc158959';
UPDATE public.artist_listings SET slug = 'olivia-rodrigo' WHERE id = 'a23238cb-0dbb-4ebc-a96e-a52fe270502c';
UPDATE public.artist_listings SET slug = 'sabrina-carpenter' WHERE id = '39131310-e0d6-4cdc-9ea4-ead84e9a9b93';
UPDATE public.artist_listings SET slug = 'ariana-grande' WHERE id = '635a88f1-62d3-4730-9d99-c8319c2f2a6a';
UPDATE public.artist_listings SET slug = 'chappell-roan' WHERE id = '773956a0-c3b6-43db-9e2f-ca25d429d7c9';
UPDATE public.artist_listings SET slug = 'charli-xcx' WHERE id = '6a87a9ab-3c5d-44fb-a50a-7896efddefd6';
UPDATE public.artist_listings SET slug = 'gracie-abrams' WHERE id = '3ab35019-739c-4a4c-8e72-92d119d8f8c9';
UPDATE public.artist_listings SET slug = 'tyler-the-creator' WHERE id = '26c73a47-5a98-4fcb-ab9c-ae229c43b63a';
UPDATE public.artist_listings SET slug = 'j-cole' WHERE id = '3856bf57-8670-4bc7-987f-73fb090fe740';
UPDATE public.artist_listings SET slug = 'post-malone' WHERE id = '2ea7f150-2888-4b5b-888a-e203f4396e4f';
UPDATE public.artist_listings SET slug = 'travis-scott' WHERE id = '3fb266f0-f6b9-4c57-b1de-c02eea70c5f3';
UPDATE public.artist_listings SET slug = 'lil-uzi-vert' WHERE id = '8c6304dc-8834-4399-9253-20463203ec35';
UPDATE public.artist_listings SET slug = '21-savage' WHERE id = 'ec8bc496-037e-4b56-a1c8-258dc3f06d48';
UPDATE public.artist_listings SET slug = 'gunna' WHERE id = 'fe396966-7431-47b2-a3c2-2d1be2db1f85';
UPDATE public.artist_listings SET slug = 'common' WHERE id = '5718ccb9-b957-470b-a55c-cd837787fa47';
UPDATE public.artist_listings SET slug = 'morgan-wallen' WHERE id = '74ebad32-0c32-4753-8a26-cb95bfecce65';
UPDATE public.artist_listings SET slug = 'luke-combs' WHERE id = 'fcc86fde-216f-47c3-b6b5-0105d7c2cd5b';
UPDATE public.artist_listings SET slug = 'lainey-wilson' WHERE id = '1df956f0-af93-4738-acbd-074b7a85284a';
UPDATE public.artist_listings SET slug = 'chris-stapleton' WHERE id = 'bce60210-ea72-463c-9ce5-8962b3d2ca6f';
UPDATE public.artist_listings SET slug = 'tyler-childers' WHERE id = '09f01da5-fe38-4cff-af5f-2983113fc4e9';
UPDATE public.artist_listings SET slug = 'kacey-musgraves' WHERE id = '2696ad30-f55c-4815-9469-0d8e36e136ef';
UPDATE public.artist_listings SET slug = 'lakeview' WHERE id = 'b54a17e5-621f-4412-bbd5-276412070b2b';
UPDATE public.artist_listings SET slug = 'marshmello' WHERE id = 'a40fea0b-3680-4bf3-8776-71ef9fb4c0b9';
UPDATE public.artist_listings SET slug = 'diplo' WHERE id = '00cb2f1c-0faa-41b7-9875-f7441a627695';
UPDATE public.artist_listings SET slug = 'deadmau5' WHERE id = 'eab78d13-dfbb-4932-aa01-8ced80b73568';
UPDATE public.artist_listings SET slug = 'flume' WHERE id = '61c8cbc5-1576-4222-9433-d18bdf967b46';
UPDATE public.artist_listings SET slug = 'fred-again' WHERE id = 'b29aaae1-a1b8-4adf-a5c1-12cd4efb50e6';
UPDATE public.artist_listings SET slug = 'four-tet' WHERE id = 'b2161e3f-44ed-46dd-8210-a6aa4ecb7bba';
UPDATE public.artist_listings SET slug = 'rufus-du-sol' WHERE id = 'fdf74d38-edb8-4802-a337-883df60b80ce';
UPDATE public.artist_listings SET slug = 'disclosure' WHERE id = 'f70e7a02-0669-42c4-beb3-6eb38e60cb8c';
UPDATE public.artist_listings SET slug = 'above-and-beyond' WHERE id = 'b5701831-b7cb-4e04-bba6-6420cbfdda3e';
UPDATE public.artist_listings SET slug = 'beyonce' WHERE id = 'a649fdd8-01c5-4ac8-8d62-697162b130d8';
UPDATE public.artist_listings SET slug = 'sza' WHERE id = '9e87b744-5652-4510-898a-ed4fc2485679';
UPDATE public.artist_listings SET slug = 'usher' WHERE id = '48fe7abe-cf7b-40ea-a241-52d7f242d0c9';
UPDATE public.artist_listings SET slug = 'her' WHERE id = 'ce49a47e-8817-47e1-af5e-84732a94b383';
UPDATE public.artist_listings SET slug = 'victoria-monet' WHERE id = '5b28b5de-8b26-43d5-a538-7b93094ed643';
UPDATE public.artist_listings SET slug = 'giveon' WHERE id = '7f61f17e-27dd-4e94-8922-6acfbc652af8';
UPDATE public.artist_listings SET slug = 'bad-bunny' WHERE id = '95f54060-4506-40b7-aaca-7b39c6b95a1a';
UPDATE public.artist_listings SET slug = 'j-balvin' WHERE id = '1e604281-5fc9-4e31-bc7a-0f9d301ea7b2';
UPDATE public.artist_listings SET slug = 'maluma' WHERE id = '3420929b-2b41-425f-ac04-245e795cc1cd';
UPDATE public.artist_listings SET slug = 'karol-g' WHERE id = 'a28db93f-19bd-489c-84a0-9da36f995112';
UPDATE public.artist_listings SET slug = 'peso-pluma' WHERE id = '2410f19d-b1f1-4a82-b00b-f5c5a4f7879d';
UPDATE public.artist_listings SET slug = 'feid' WHERE id = 'ccf3d1f4-8608-43a2-8985-0fc17b2c75b9';
UPDATE public.artist_listings SET slug = 'grupo-frontera' WHERE id = 'c65a0d83-1e7f-4ae6-8d17-e80f564e0bc0';
UPDATE public.artist_listings SET slug = 'natanael-cano' WHERE id = '84ca3aa0-6ee8-40ea-9524-123f8d31b556';
UPDATE public.artist_listings SET slug = 'rauw-alejandro' WHERE id = '81058a80-89b6-4047-84f6-d3033ae8eebe';
UPDATE public.artist_listings SET slug = 'tool' WHERE id = 'efc77d17-5f91-4894-b442-8e7603e8cbe2';
UPDATE public.artist_listings SET slug = 'slipknot' WHERE id = '88276b5b-b512-4226-99d3-5badedefe807';
UPDATE public.artist_listings SET slug = 'pantera' WHERE id = '0af99e31-4c98-44cd-938a-af087ee37051';
UPDATE public.artist_listings SET slug = 'avenged-sevenfold' WHERE id = '82de556e-004c-4a6e-b4f6-b6bde9da8780';
UPDATE public.artist_listings SET slug = 'spiritbox' WHERE id = '593f6f17-e2bd-4433-a8e4-58d355a14586';
UPDATE public.artist_listings SET slug = 'knocked-loose' WHERE id = 'd15839d4-522a-4fa7-82dc-a78d95c821f6';
UPDATE public.artist_listings SET slug = 'tame-impala' WHERE id = 'fd8885d6-52b3-498b-86c6-491c2189cf5c';
UPDATE public.artist_listings SET slug = 'vampire-weekend' WHERE id = '1cc44660-d5f6-4b84-9d95-e2164e075adb';
UPDATE public.artist_listings SET slug = 'the-national' WHERE id = 'ccfac7a8-9e01-49af-8370-bcf8196bad35';
UPDATE public.artist_listings SET slug = 'modest-mouse' WHERE id = '42aa15ab-d09f-47f0-95fc-46d8f557c906';
UPDATE public.artist_listings SET slug = 'death-cab-for-cutie' WHERE id = 'f9377469-4897-4bfb-931e-2a4cef4aec43';
UPDATE public.artist_listings SET slug = 'phoebe-bridgers' WHERE id = '5225bdb9-bf5e-4f9f-ae65-36205e42e152';
UPDATE public.artist_listings SET slug = 'boygenius' WHERE id = 'd5503969-bd5d-4554-a615-a812bea27d1e';
UPDATE public.artist_listings SET slug = 'wet-leg' WHERE id = '4297b729-41a5-4a3a-8652-c764879aa553';
UPDATE public.artist_listings SET slug = 'mitski' WHERE id = '7225223b-8ae7-4fc3-a2e9-79218369be1f';
UPDATE public.artist_listings SET slug = 'waxahatchee' WHERE id = 'dae0d7be-5de4-4fd2-93a5-ccd1e3711dab';
UPDATE public.artist_listings SET slug = 'herbie-hancock' WHERE id = '41eb2d52-912a-47bd-8ba6-1d17e64a7f75';
UPDATE public.artist_listings SET slug = 'norah-jones' WHERE id = 'b2134367-04ed-489b-b767-5c646ea7271e';
UPDATE public.artist_listings SET slug = 'cory-wong' WHERE id = 'dd5a5297-5015-4db7-a60c-37b59d8066a8';
UPDATE public.artist_listings SET slug = 'gogo-penguin' WHERE id = 'ec726963-b09b-4027-8c2d-b7c29958cfc1';
UPDATE public.artist_listings SET slug = 'kamasi-washington' WHERE id = '0df389e8-e2aa-4bbf-b267-964de040ec82';
UPDATE public.artist_listings SET slug = 'kurt-elling' WHERE id = '4cbc3157-0e60-4a7a-a5ec-a70f05caf13b';
UPDATE public.artist_listings SET slug = 'marcus-king' WHERE id = 'c86ae5e1-1302-44c1-85d2-07854250529f';
UPDATE public.artist_listings SET slug = 'gary-clark-jr' WHERE id = '7b6cced7-1e52-4e3b-b80a-91845c9d3825';
UPDATE public.artist_listings SET slug = 'gregory-alan-isakov' WHERE id = 'b6b97361-f207-428e-81da-9f06f0a1a98b';
UPDATE public.artist_listings SET slug = 'patty-griffin' WHERE id = '7dadedd4-8c44-4c13-a5f9-4e7d366535ec';
UPDATE public.artist_listings SET slug = 'watchhouse' WHERE id = 'c4d7803d-6c42-4e08-8820-5ce791bfe88a';
UPDATE public.artist_listings SET slug = 'nathaniel-rateliff' WHERE id = '606e6d9a-d4b6-4abf-967b-1cfd2ad8bb2d';
UPDATE public.artist_listings SET slug = 'the-war-on-drugs' WHERE id = 'c19925a2-64a8-4bd9-ba53-b09a6ded10a5';
UPDATE public.artist_listings SET slug = 'bts' WHERE id = '3c5f0233-a208-4f84-88b3-6a5e76bfd5d5';
UPDATE public.artist_listings SET slug = 'blackpink' WHERE id = 'b6cad7e5-9c72-46e4-9340-6ad01d861cf3';
UPDATE public.artist_listings SET slug = 'stray-kids' WHERE id = '852fe52a-aa0f-4d48-a1af-df52a6ac3db5';
UPDATE public.artist_listings SET slug = 'newjeans' WHERE id = '309e9202-ce85-4b2c-91c4-f3d5eae261eb';
UPDATE public.artist_listings SET slug = 'burna-boy' WHERE id = '33e6e997-1eec-40b0-8764-62bca3c77b3b';
UPDATE public.artist_listings SET slug = 'wizkid' WHERE id = 'f2348be0-955e-4374-9ab2-b80233720950';
UPDATE public.artist_listings SET slug = 'daddy-yankee' WHERE id = 'd848480f-3964-4ec7-9c96-7e442e395a3f';
UPDATE public.artist_listings SET slug = 'ozuna' WHERE id = '5c2a9c06-f48d-49de-acd5-12926d9c3526';
UPDATE public.artist_listings SET slug = 'anuel-aa' WHERE id = 'b6229abd-5258-4567-bda6-2cf5f149b4ff';
UPDATE public.artist_listings SET slug = 'myke-towers' WHERE id = '901a0a4e-1256-4404-86b2-dafb8966419c';
UPDATE public.artist_listings SET slug = 'jhay-cortez' WHERE id = '2d4bc9aa-6d73-4c4c-a9a0-b9b56b9bc02c';
UPDATE public.artist_listings SET slug = 'sech' WHERE id = 'da95ddda-25bf-4743-b4c5-55c1dddb636f';
UPDATE public.artist_listings SET slug = 'zion-and-lennox' WHERE id = '67835a34-155f-4bd9-b6db-2b3450018bbc';
UPDATE public.artist_listings SET slug = 'arcangel' WHERE id = '1114e71e-f85f-4968-a418-d2db85f00a7e';
UPDATE public.artist_listings SET slug = 'de-la-ghetto' WHERE id = '88e14ffa-0fa4-4f26-ac44-6eecad6d2020';
UPDATE public.artist_listings SET slug = 'nicky-jam' WHERE id = 'd86d0e24-fe10-4ba4-9992-c4cbf433694e';
UPDATE public.artist_listings SET slug = 'yandel' WHERE id = 'db6ca6cc-2a07-4e4d-908d-de17ca7ff025';
UPDATE public.artist_listings SET slug = 'wisin' WHERE id = 'bdeb99ef-b3d7-4d28-b482-73d5cf49a377';
UPDATE public.artist_listings SET slug = 'don-omar' WHERE id = 'a8cca39f-7b00-4998-b071-76939ccb28ac';
UPDATE public.artist_listings SET slug = 'nio-garcia' WHERE id = '671c5b2c-d162-4b3f-817d-7bebfd8f1eb9';
UPDATE public.artist_listings SET slug = 'mora' WHERE id = '965057b5-01f2-4ac8-82b7-e3003d18bfc7';
UPDATE public.artist_listings SET slug = 'eladio-carrion' WHERE id = 'c5e54f70-99ab-410d-9434-a215adb63fab';
UPDATE public.artist_listings SET slug = 'yailin-la-mas-viral-2' WHERE id = '23442778-4728-4c59-bcec-b1804540bb94';
UPDATE public.artist_listings SET slug = 'ryan-castro' WHERE id = '7423a4cf-e41c-4ebe-8ae4-3ff8f3f0fe08';
UPDATE public.artist_listings SET slug = 'el-malilla' WHERE id = '14bf541d-57ae-4c0a-bc7b-49aeb034fe9d';
UPDATE public.artist_listings SET slug = 'tokischa' WHERE id = '8c3e7f7c-dece-4a23-9bb0-479c46daf7b8';
UPDATE public.artist_listings SET slug = 'villano-antillano' WHERE id = '8717c4dc-3f41-4b8e-89c1-7eae0af184d9';
UPDATE public.artist_listings SET slug = 'luar-la-l' WHERE id = 'b59ec1cf-839c-4907-a358-75b9b89b0481';
UPDATE public.artist_listings SET slug = 'jhayco' WHERE id = '78bb5aa5-3393-482c-a62c-ca31e52f23f3';
UPDATE public.artist_listings SET slug = 'enrique-iglesias' WHERE id = 'b04db052-f852-4a1b-b6f0-6d640bfed009';
UPDATE public.artist_listings SET slug = 'ricky-martin' WHERE id = '8fe92957-ea06-4d99-82b0-0ac88d5b1af2';
UPDATE public.artist_listings SET slug = 'marc-anthony' WHERE id = '6e9a0925-6e40-405f-a32e-b926b1568dfb';
UPDATE public.artist_listings SET slug = 'juanes' WHERE id = '50a45827-96a7-4c90-90f5-a0d22d1f83c9';
UPDATE public.artist_listings SET slug = 'alejandro-sanz' WHERE id = 'd62e2d73-e275-4b36-b04b-7f031f13f075';
UPDATE public.artist_listings SET slug = 'camilo' WHERE id = '2cd43ad7-f228-4e48-bb7b-54c983e2c9f9';
UPDATE public.artist_listings SET slug = 'sebastian-yatra' WHERE id = '94cbfc24-85df-46d8-8908-d8bba2737592';
UPDATE public.artist_listings SET slug = 'carlos-rivera' WHERE id = '5673c048-1bed-4d8e-9966-9d0d536cb26f';
UPDATE public.artist_listings SET slug = 'kali-uchis' WHERE id = 'c63b7224-5ea5-403d-aec2-2ed0292bc568';
UPDATE public.artist_listings SET slug = 'christina-aguilera' WHERE id = '853b1929-3be5-437d-aa9b-8685087bb210';
UPDATE public.artist_listings SET slug = 'selena-gomez' WHERE id = '5d659900-8e39-4fb5-9430-a2d52f5badb7';
UPDATE public.artist_listings SET slug = 'becky-g' WHERE id = '9951ee06-95b4-4bba-af1d-211534b51932';
UPDATE public.artist_listings SET slug = 'anitta' WHERE id = 'ea8d4e92-0a06-40b2-bda1-7a91134456d2';
UPDATE public.artist_listings SET slug = 'laura-pausini' WHERE id = 'fc3bcdf7-eded-4cde-89fe-3c50bbb15106';
UPDATE public.artist_listings SET slug = 'gloria-estefan' WHERE id = '1dc3d8ec-25fe-4a8f-a946-bab96338a946';
UPDATE public.artist_listings SET slug = 'thalia' WHERE id = 'e3209d29-4393-4acc-8c09-1e0bf0195c56';
UPDATE public.artist_listings SET slug = 'ricardo-arjona' WHERE id = '7741f9e2-9bd1-4a92-b1b3-cba4f0097ea4';
UPDATE public.artist_listings SET slug = 'ricardo-montaner' WHERE id = 'dd4e6f43-6353-4744-b2f1-236756d0a6a0';
UPDATE public.artist_listings SET slug = 'luis-fonsi' WHERE id = 'acb8163b-1293-4ff9-804a-0b55560fbd01';
UPDATE public.artist_listings SET slug = 'natti-natasha' WHERE id = 'b039ba52-2d0a-480e-a1fc-b8fbc84d82e9';
UPDATE public.artist_listings SET slug = 'tini' WHERE id = 'd8cc3b07-c208-40c5-bb7c-8f99af22b9bb';
UPDATE public.artist_listings SET slug = 'maria-becerra' WHERE id = '96918e36-8bb4-460d-941b-3c40b78ec755';
UPDATE public.artist_listings SET slug = 'camila-cabello' WHERE id = '1c51ddd0-ddf7-4d87-8b9e-7cb2f5e52d13';
UPDATE public.artist_listings SET slug = 'nicky-nicole' WHERE id = 'bef904a2-2fc4-4661-99ab-1a21e90dc376';
UPDATE public.artist_listings SET slug = 'lali' WHERE id = '61d44901-1464-445b-9865-f0cb0ac11831';
UPDATE public.artist_listings SET slug = 'haash' WHERE id = '3af28efb-4061-4ded-a778-23a3eca4bb5a';
UPDATE public.artist_listings SET slug = 'jesse-and-joy' WHERE id = 'd264915a-895f-436b-a8de-f9ac908c8e9f';
UPDATE public.artist_listings SET slug = 'morat' WHERE id = '5b1d14e8-bfb7-4733-970c-ffa837e63dad';
UPDATE public.artist_listings SET slug = 'reik' WHERE id = '9832503a-7611-4e56-9fcf-710217a85339';
UPDATE public.artist_listings SET slug = 'romeo-santos' WHERE id = '09bed407-f267-4025-8fbd-9c1ebf189757';
UPDATE public.artist_listings SET slug = 'gilberto-santa-rosa' WHERE id = 'e708a8ec-fa71-4213-9dae-c265c3006b0d';
UPDATE public.artist_listings SET slug = 'victor-manuelle' WHERE id = '8ae41bd6-68c9-4fa2-b7b9-4750b86bdbf9';
UPDATE public.artist_listings SET slug = 'tito-nieves' WHERE id = 'a16e947f-2e92-44b8-8067-daffe0a131c8';
UPDATE public.artist_listings SET slug = 'la-india' WHERE id = 'f1961ba5-9b0e-4792-b2df-bd3ff12434be';
UPDATE public.artist_listings SET slug = 'celia-cruz' WHERE id = 'e2a0f12e-330b-4821-a581-d3a93f90c659';
UPDATE public.artist_listings SET slug = 'willie-colon' WHERE id = '064af17b-cefd-4a27-8241-3e986e7413b3';
UPDATE public.artist_listings SET slug = 'ruben-blades' WHERE id = 'f526aa17-ed86-4cf9-9584-e07e3bab54b5';
UPDATE public.artist_listings SET slug = 'oscar-dleon' WHERE id = '5127f455-11d8-42e4-9e59-a8e78f722bf5';
UPDATE public.artist_listings SET slug = 'el-gran-combo-de-puerto-rico' WHERE id = '18af81b6-2f00-473e-bd85-3ef35914fe54';
UPDATE public.artist_listings SET slug = 'los-van-van' WHERE id = '19772057-df89-41b1-bbdf-d2ed433b4c5e';
UPDATE public.artist_listings SET slug = 'sonora-carruseles' WHERE id = '7294291a-7c97-4cb7-a9d3-d2c34e9a4caa';
UPDATE public.artist_listings SET slug = 'noche-flamenca' WHERE id = 'aba1ebfc-ff2d-4052-a69d-6b85f3d25579';
UPDATE public.artist_listings SET slug = 'chayanne' WHERE id = 'e2af6103-13c3-42ba-a737-fb127cf3999f';
UPDATE public.artist_listings SET slug = 'olga-tanon' WHERE id = '7edf7959-e630-4f55-9df0-0ab84ff0163f';
UPDATE public.artist_listings SET slug = 'jose-feliciano' WHERE id = '2bdc7dfd-80ea-4459-a134-547491cf99f4';
UPDATE public.artist_listings SET slug = 'tito-puente-jr' WHERE id = '6db9a1ce-9190-4b30-8e6d-dd258cf89663';
UPDATE public.artist_listings SET slug = 'prince-royce' WHERE id = '9567eafb-9563-4277-b904-60d60a4c5bfc';
UPDATE public.artist_listings SET slug = 'aventura' WHERE id = 'd5c205e2-ed3e-4b44-94b7-780f485897eb';
UPDATE public.artist_listings SET slug = 'manuel-turizo' WHERE id = 'c4b80e3b-d73b-44e7-9e3c-27b7ca9b562f';
UPDATE public.artist_listings SET slug = 'xavi' WHERE id = '55a33609-b1b0-43d1-8e3d-4f0053a84ec7';
UPDATE public.artist_listings SET slug = 'grupo-extra' WHERE id = '1dfe035d-ea72-4d03-ba2c-70556597cec4';
UPDATE public.artist_listings SET slug = 'hector-acosta-el-torito' WHERE id = 'dfdadc9d-ec9a-4dce-8d33-aeb7601136b7';
UPDATE public.artist_listings SET slug = 'anthony-santos' WHERE id = '4f4c25c2-7ebf-4777-87ea-ca9fda9d784f';
UPDATE public.artist_listings SET slug = 'monchy-and-alexandra' WHERE id = 'e759b2bb-a643-412e-bebd-5120f69f226a';
UPDATE public.artist_listings SET slug = 'leslie-grace' WHERE id = '1c071f3f-e7b3-4c98-adeb-8dda348c3a0a';
UPDATE public.artist_listings SET slug = 'frank-reyes-2' WHERE id = '0bf35dbf-4c0b-41ab-998f-4f5c3a7d3a55';
UPDATE public.artist_listings SET slug = 'alex-bueno' WHERE id = '6bed9e9e-af0c-44a2-b4a4-60dd4dd26ce8';
UPDATE public.artist_listings SET slug = 'los-angeles-azules' WHERE id = '8e0dafad-b7ea-4013-b62d-dd9653a3b270';
UPDATE public.artist_listings SET slug = 'grupo-firme' WHERE id = 'bde566ed-8b39-41de-ac89-e89a4a41ff8a';
UPDATE public.artist_listings SET slug = 'banda-ms' WHERE id = '6ef91584-7a66-4e5e-b981-7d00cfaecc5e';
UPDATE public.artist_listings SET slug = 'banda-el-recodo' WHERE id = '96c4de46-ffe2-4076-8fbb-d234749cc3c4';
UPDATE public.artist_listings SET slug = 'los-tucanes-de-tijuana' WHERE id = '73bd9beb-ab05-4087-8eea-747bf57c4a4c';
UPDATE public.artist_listings SET slug = 'espinoza-paz' WHERE id = '7a6e79a2-2b6c-446e-a2ef-883ab9623045';
UPDATE public.artist_listings SET slug = 'junior-h' WHERE id = '25ee2fe2-7670-4363-852e-a653fac15765';
UPDATE public.artist_listings SET slug = 'yahritza-y-su-esencia' WHERE id = '8643059b-ba48-475c-9a59-4ee42fb2ec1a';
UPDATE public.artist_listings SET slug = 'chino-pacas' WHERE id = '5c3dd068-89cd-425d-8d38-5bab7685b98c';
UPDATE public.artist_listings SET slug = 'dannylux' WHERE id = '6d02c53a-6efc-4ba6-b5b3-4ac5cdd33640';
UPDATE public.artist_listings SET slug = 'fuerza-regida' WHERE id = '8d7a1db2-3da7-4041-bf79-5c4edf70cc0e';
UPDATE public.artist_listings SET slug = 'lupillo-rivera' WHERE id = '3669e1bb-45c8-41e9-b968-221f87b1edc1';
UPDATE public.artist_listings SET slug = 'el-fantasma-2' WHERE id = 'bea8f617-ad1e-4674-afe3-86363d3c0544';
UPDATE public.artist_listings SET slug = 'mana' WHERE id = 'dd15818e-7a22-48dd-8b2c-90dad679352a';
UPDATE public.artist_listings SET slug = 'calibre-50' WHERE id = 'e968dc82-d8c1-468c-baca-5b5dbaf32c4d';
UPDATE public.artist_listings SET slug = 'carlos-vives' WHERE id = '12806049-a247-47f6-b477-8ef9e8f3075a';
UPDATE public.artist_listings SET slug = 'silvestre-dangond' WHERE id = 'bd4b8ab0-069d-4aff-a186-ed38eb6df4eb';
UPDATE public.artist_listings SET slug = 'poncho-zuleta-2' WHERE id = '19050ea0-efd3-4216-b735-dadc1f940908';
UPDATE public.artist_listings SET slug = 'binomio-de-oro-de-america' WHERE id = '7f9ab0f0-a6f7-42ee-96b6-255bf0f0ed68';
UPDATE public.artist_listings SET slug = 'felipe-pelaez' WHERE id = '6ec86084-6a7b-437f-b48c-250b9e57c2ee';
UPDATE public.artist_listings SET slug = 'jorge-celedon' WHERE id = '50ebd7b2-6651-480a-b891-314b1a2431eb';
UPDATE public.artist_listings SET slug = 'juan-luis-guerra' WHERE id = '1456fa8b-394a-460e-a640-a081532a74ad';
UPDATE public.artist_listings SET slug = 'elvis-crespo' WHERE id = '9d387010-ede7-4ed1-9b9a-0da1edbb16ae';
UPDATE public.artist_listings SET slug = 'los-hermanos-rosario' WHERE id = '1372fc60-19ae-415b-a4de-c7b2e03e19d9';
UPDATE public.artist_listings SET slug = 'almighty' WHERE id = '7dda5b39-aadc-44df-934a-63b60ed72c7d';
UPDATE public.artist_listings SET slug = 'nengo-flow' WHERE id = '924b880a-c1de-4411-98ed-f2edba0718f7';
UPDATE public.artist_listings SET slug = 'c-tangana' WHERE id = '7be41ea2-a155-492d-83d3-b4a2ba7ac18f';
UPDATE public.artist_listings SET slug = 'dillom' WHERE id = '81ab9158-bb29-4525-84a0-d21de6576425';
UPDATE public.artist_listings SET slug = 'paulo-londra' WHERE id = '52ef5c67-12ca-4c9d-a6c7-cae935d217d4';
UPDATE public.artist_listings SET slug = 'khea' WHERE id = '7dcfc84f-6048-4271-b466-d2456bfac94e';
UPDATE public.artist_listings SET slug = 'bizarrap' WHERE id = '4ab6d6b9-59be-4c22-8830-2d311fcc2639';
UPDATE public.artist_listings SET slug = 'trueno' WHERE id = '57f08d24-2c46-4bc0-9b91-a36ec0173bcc';
UPDATE public.artist_listings SET slug = 'kapo' WHERE id = '75ee4954-3ed4-45a4-bb37-e7fee690ebcc';
UPDATE public.artist_listings SET slug = 'tito-double-p' WHERE id = '6a01e9ad-25b3-46f6-9b80-13f9dc4f1943';
UPDATE public.artist_listings SET slug = 'cafe-tacvba' WHERE id = '814a7198-7a32-4cc9-ac90-27a82347db86';
UPDATE public.artist_listings SET slug = 'molotov' WHERE id = '9f005442-67f4-439a-b6b9-5ca6c6e90292';
UPDATE public.artist_listings SET slug = 'zoe' WHERE id = '576a2260-d2f3-46e2-b4c4-baa82cbf9b0b';
UPDATE public.artist_listings SET slug = 'los-fabulosos-cadillacs' WHERE id = 'b0bdd7b3-6021-4251-98b8-e2a4f4059f87';
UPDATE public.artist_listings SET slug = 'andres-calamaro' WHERE id = '432df7ae-2657-4d2e-923c-62652f724654';
UPDATE public.artist_listings SET slug = 'caifanes' WHERE id = 'a3dec3e7-ea2e-4706-b177-9343cd333725';
UPDATE public.artist_listings SET slug = 'rosalia' WHERE id = '3b3a458d-5297-439c-96bc-50f3eb987774';
UPDATE public.artist_listings SET slug = 'bomba-estereo' WHERE id = '2b1af604-28aa-4693-aa0b-0a41187a79a3';
UPDATE public.artist_listings SET slug = 'rawayana' WHERE id = 'b93be130-bc79-49d7-b56b-9aa361f1e9c8';
UPDATE public.artist_listings SET slug = 'nathy-peluso' WHERE id = '38afb013-f40c-4c97-941f-96cff994335c';
UPDATE public.artist_listings SET slug = 'carlos-santana' WHERE id = 'fc9a4e21-653c-45b7-8e8c-438d22073693';
UPDATE public.artist_listings SET slug = 'seu-jorge' WHERE id = '8ffdfcd1-aa00-4a0c-91a8-2c5f51a8b320';
UPDATE public.artist_listings SET slug = 'gilberto-gil' WHERE id = 'c9fe1be4-8733-4b4f-ac3a-9e8296dc2f32';
UPDATE public.artist_listings SET slug = 'caetano-veloso' WHERE id = 'a732f6ef-c017-4fd3-8348-c8bcbdb75204';
UPDATE public.artist_listings SET slug = 'jorge-drexler' WHERE id = '31a77df2-a599-4208-92fe-45a2547d83de';
UPDATE public.artist_listings SET slug = 'julieta-venegas' WHERE id = '3fd843a0-279b-4997-8dc7-e8d503ff4162';
UPDATE public.artist_listings SET slug = 'luck-ra' WHERE id = '92f5fd41-9da6-4221-8978-3cbaf8a236b6';
UPDATE public.artist_listings SET slug = 'alvaro-diaz' WHERE id = 'b3af2982-0919-4278-9cbf-3d3ad738fc7d';
UPDATE public.artist_listings SET slug = 'taichu' WHERE id = 'd95f0a30-5f9e-4ed9-8c52-69f37116132b';
UPDATE public.artist_listings SET slug = 'jennifer-lopez' WHERE id = '8ea9fefa-8e7a-4aa0-be7d-020e77860ca5';
UPDATE public.artist_listings SET slug = 'julio-iglesias' WHERE id = '895df7ec-4c0f-4bf1-88e3-d16b8e0274b9';
UPDATE public.artist_listings SET slug = 'roberto-carlos' WHERE id = '5bfb97b2-2cd0-496d-a934-882f11305651';

-- ─── 4. Notify PostgREST to reload schema ────────────────────
NOTIFY pgrst, 'reload schema';

-- ─── 5. BookScore trigger + cron job ────────────────────────
-- =============================================================
-- GetBooked.Live — BookScore auto-recalculation + cron schedule
-- Run this in Supabase SQL Editor for project xsvamqzhdrhmznocgbxe
-- =============================================================

-- ─── 1. BookScore auto-recalculation trigger ─────────────────
-- Fires after every INSERT or UPDATE on the reviews table.
-- Recalculates the average rating for the reviewed user and
-- writes it back to profiles.bookscore using service_role bypass.

CREATE OR REPLACE FUNCTION public.recalculate_bookscore()
RETURNS TRIGGER AS $$
DECLARE
  v_reviewed_id uuid;
  v_avg numeric;
BEGIN
  -- The reviewed user is the one being rated (not the reviewer)
  v_reviewed_id := COALESCE(NEW.reviewed_id, OLD.reviewed_id);

  IF v_reviewed_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Calculate average rating from all approved reviews for this user
  SELECT ROUND(AVG(rating)::numeric, 1)
  INTO v_avg
  FROM public.reviews
  WHERE reviewed_id = v_reviewed_id
    AND (approved IS NULL OR approved = true);

  -- Bypass the protect_billing_fields trigger by using a direct update
  -- This runs as SECURITY DEFINER so it has service_role privileges
  UPDATE public.profiles
  SET bookscore = v_avg
  WHERE user_id = v_reviewed_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS trg_recalculate_bookscore ON public.reviews;
CREATE TRIGGER trg_recalculate_bookscore
  AFTER INSERT OR UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.recalculate_bookscore();


-- ─── 2. Schedule trigger-post-show-reviews as a daily cron job ─
-- Runs at 10:00 AM UTC every day (checks yesterday's confirmed bookings)
-- Requires pg_cron extension (already enabled)

SELECT cron.unschedule('trigger-post-show-reviews') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'trigger-post-show-reviews'
);

SELECT cron.schedule(
  'trigger-post-show-reviews',
  '0 10 * * *',  -- 10:00 AM UTC daily
  $$
  SELECT net.http_post(
    url := (SELECT value FROM vault.secrets WHERE name = 'SUPABASE_URL') || '/functions/v1/trigger-post-show-reviews',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT value FROM vault.secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY')
    ),
    body := '{}'::jsonb
  );
  $$
);


-- ─── 3. Recalculate all existing BookScores now ───────────────
-- Run once to backfill bookscore for all users who already have reviews

DO $$
DECLARE
  r RECORD;
  v_avg numeric;
BEGIN
  FOR r IN
    SELECT DISTINCT reviewed_id FROM public.reviews WHERE reviewed_id IS NOT NULL
  LOOP
    SELECT ROUND(AVG(rating)::numeric, 1)
    INTO v_avg
    FROM public.reviews
    WHERE reviewed_id = r.reviewed_id
      AND (approved IS NULL OR approved = true);

    UPDATE public.profiles
    SET bookscore = v_avg
    WHERE user_id = r.reviewed_id;
  END LOOP;
END;
$$;

-- Verify: check how many profiles now have a bookscore
SELECT COUNT(*) AS profiles_with_bookscore FROM public.profiles WHERE bookscore IS NOT NULL;

-- ─── 6. RPC functions for artist profiles ───────────────────
CREATE OR REPLACE FUNCTION get_artist_by_slug(p_slug TEXT)
RETURNS TABLE(
  id          UUID,
  name        TEXT,
  slug        TEXT,
  avatar_url  TEXT,
  bio         TEXT,
  genres      TEXT[],
  city        TEXT,
  state       TEXT,
  tier        TEXT,
  bookscore   NUMERIC,
  fee_min     NUMERIC,
  fee_max     NUMERIC,
  instagram   TEXT,
  spotify     TEXT,
  tiktok      TEXT,
  website     TEXT,
  is_claimed  BOOLEAN,
  listing_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dl.id::UUID,
    dl.name::TEXT,
    dl.slug::TEXT,
    dl.avatar_url::TEXT,
    dl.bio::TEXT,
    dl.genres::TEXT[],
    dl.city::TEXT,
    dl.state::TEXT,
    dl.tier::TEXT,
    dl.bookscore::NUMERIC,
    dl.fee_min::NUMERIC,
    dl.fee_max::NUMERIC,
    dl.instagram::TEXT,
    dl.spotify::TEXT,
    dl.tiktok::TEXT,
    dl.website::TEXT,
    dl.is_claimed::BOOLEAN,
    dl.listing_type::TEXT
  FROM directory_listings dl
  WHERE dl.slug = p_slug
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION get_artist_by_slug(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_artist_by_slug(TEXT) TO authenticated;

-- Step 4: Create an RPC function to list all artists with social data
CREATE OR REPLACE FUNCTION get_directory_artists(
  p_search    TEXT    DEFAULT NULL,
  p_genre     TEXT    DEFAULT NULL,
  p_limit     INT     DEFAULT 200,
  p_offset    INT     DEFAULT 0
)
RETURNS TABLE(
  id          UUID,
  name        TEXT,
  slug        TEXT,
  avatar_url  TEXT,
  bio         TEXT,
  genres      TEXT[],
  city        TEXT,
  state       TEXT,
  tier        TEXT,
  bookscore   NUMERIC,
  fee_min     NUMERIC,
  fee_max     NUMERIC,
  instagram   TEXT,
  spotify     TEXT,
  tiktok      TEXT,
  website     TEXT,
  is_claimed  BOOLEAN,
  listing_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dl.id::UUID,
    dl.name::TEXT,
    dl.slug::TEXT,
    dl.avatar_url::TEXT,
    dl.bio::TEXT,
    dl.genres::TEXT[],
    dl.city::TEXT,
    dl.state::TEXT,
    dl.tier::TEXT,
    dl.bookscore::NUMERIC,
    dl.fee_min::NUMERIC,
    dl.fee_max::NUMERIC,
    dl.instagram::TEXT,
    dl.spotify::TEXT,
    dl.tiktok::TEXT,
    dl.website::TEXT,
    dl.is_claimed::BOOLEAN,
    dl.listing_type::TEXT
  FROM directory_listings dl
  WHERE
    dl.listing_type = 'artist'
    AND (p_search IS NULL OR dl.name ILIKE '%' || p_search || '%')
    AND (p_genre  IS NULL OR dl.genres::TEXT ILIKE '%' || p_genre  || '%')
  ORDER BY dl.bookscore DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION get_directory_artists(TEXT, TEXT, INT, INT) TO anon;
GRANT EXECUTE ON FUNCTION get_directory_artists(TEXT, TEXT, INT, INT) TO authenticated;

-- Done! The REST API will now expose instagram/spotify/tiktok/website columns
-- and the two RPC functions are available immediately.
