
-- 1. Schema additions
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS whatsapp_order_text text NOT NULL DEFAULT '';

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS whatsapp_sent boolean NOT NULL DEFAULT false;

-- 2. Wipe old products
DELETE FROM public.products;

-- 3. Seed RxB-style product list
INSERT INTO public.products (slug, name, emoji, gradient, category, badge, tagline, description, short_description, delivery_time, warranty, features, plans, sort_order, stock_status, image_url) VALUES

-- TOP PICKS / Editing
('capcut-pro', 'Capcut Pro Subscription Price in Bangladesh', '🎬', 'from-orange-500 to-pink-500', 'Editing Tools', 'Bestseller',
 'CapCut Pro — সব premium editing feature unlock', 'CapCut Pro with all premium effects, no watermark, 4K export, AI tools and exclusive templates.',
 'CapCut Pro full premium access — no watermark, 4K export, AI features.', 'Within 30 mins', 'Full warranty for plan duration',
 '["No watermark","4K export","All premium effects","AI features","Exclusive templates"]'::jsonb,
 '[{"period":"1 Month Shared","price":"৳300","popular":false},{"period":"1 Month Personal","price":"৳450"},{"period":"3 Month Personal","price":"৳1100","popular":true},{"period":"6 Month Personal","price":"৳1800"},{"period":"1 Year Personal","price":"৳2650"}]'::jsonb,
 1, 'in_stock', ''),

('canva-pro', 'Canva Pro Price in Bangladesh', '🎨', 'from-cyan-400 to-blue-500', 'Editing Tools', 'Hot',
 'Canva Pro — design without limits', 'Canva Pro with 100M+ premium assets, background remover, brand kit and Magic AI features.',
 'Canva Pro lifetime / yearly plans — full premium access.', 'Within 30 mins', 'Full warranty',
 '["100M+ premium assets","Background remover","Brand kit","Magic AI features","Unlimited folders"]'::jsonb,
 '[{"period":"1 Month","price":"৳50"},{"period":"3 Month","price":"৳120"},{"period":"6 Month","price":"৳200"},{"period":"1 Year","price":"৳350","popular":true},{"period":"Lifetime","price":"৳500"}]'::jsonb,
 2, 'in_stock', ''),

('chatgpt-plus', 'ChatGPT Plus Subscription Price in Bangladesh', '🤖', 'from-emerald-400 to-teal-600', 'AI & Education', 'Top Pick',
 'ChatGPT Plus — GPT-5, image gen, advanced voice', 'Official ChatGPT Plus subscription with GPT-5 access, DALL-E image generation, advanced voice mode and priority access.',
 'Genuine ChatGPT Plus account — GPT-5 access included.', 'Within 1 hour', 'Full warranty',
 '["GPT-5 access","DALL-E image generation","Advanced voice mode","Priority access","Custom GPTs"]'::jsonb,
 '[{"period":"1 Month Shared","price":"৳370"},{"period":"1 Month Personal","price":"৳1200","popular":true},{"period":"3 Month Personal","price":"৳2800"}]'::jsonb,
 3, 'in_stock', ''),

('netflix-premium', 'Netflix Subscription Price in Bangladesh', '🎥', 'from-red-600 to-rose-700', 'OTT & Streaming', 'Bestseller',
 'Netflix Premium — 4K UHD streaming', 'Netflix Premium plan — 4K UHD quality, watch on 4 devices simultaneously, all originals & global library.',
 '4K UHD Netflix Premium — all originals.', 'Within 30 mins', 'Full warranty for plan duration',
 '["4K UHD quality","4 simultaneous screens","All originals","Global content library","Download on 6 devices"]'::jsonb,
 '[{"period":"1 Month","price":"৳350"},{"period":"3 Month","price":"৳950","popular":true},{"period":"6 Month","price":"৳1200"}]'::jsonb,
 4, 'in_stock', ''),

('amazon-prime-video', 'Amazon Prime Video Subscription Price in Bangladesh', '📺', 'from-blue-500 to-indigo-700', 'OTT & Streaming', null,
 'Prime Video — Premium streaming', 'Amazon Prime Video subscription with all original series, movies and live sports.',
 'Amazon Prime Video — full library access.', 'Within 30 mins', 'Full warranty',
 '["All Prime Originals","HD/4K quality","Multi-device","Download support"]'::jsonb,
 '[{"period":"1 Month","price":"৳120"},{"period":"3 Month","price":"৳320"},{"period":"6 Month","price":"৳600"},{"period":"1 Year","price":"৳1150","popular":true}]'::jsonb,
 5, 'in_stock', ''),

('spotify-premium', 'Spotify Premium Subscription Price in Bangladesh', '🎵', 'from-green-500 to-emerald-700', 'OTT & Streaming', null,
 'Spotify Premium — ad-free music', 'Spotify Premium with ad-free music, offline downloads, unlimited skips and high quality audio.',
 'Spotify Premium individual / family plans.', 'Within 30 mins', 'Full warranty',
 '["Ad-free music","Offline downloads","Unlimited skips","High quality audio"]'::jsonb,
 '[{"period":"1 Month","price":"৳150"},{"period":"3 Month","price":"৳400"},{"period":"6 Month","price":"৳750"},{"period":"1 Year","price":"৳1400","popular":true}]'::jsonb,
 6, 'in_stock', ''),

('youtube-premium', 'YouTube Premium Subscription Price in Bangladesh', '▶️', 'from-red-500 to-red-700', 'OTT & Streaming', null,
 'YouTube Premium + Music', 'YouTube Premium with ad-free videos, background play, downloads and YouTube Music included.',
 'YouTube Premium + YouTube Music — ad-free.', 'Within 30 mins', 'Full warranty',
 '["Ad-free YouTube","Background play","Offline downloads","YouTube Music included"]'::jsonb,
 '[{"period":"1 Month","price":"৳180"},{"period":"3 Month","price":"৳500"},{"period":"6 Month","price":"৳950"},{"period":"1 Year","price":"৳1800","popular":true}]'::jsonb,
 7, 'in_stock', ''),

('disney-plus', 'Disney+ Hotstar Subscription Bangladesh', '🏰', 'from-blue-600 to-purple-700', 'OTT & Streaming', null,
 'Disney+ Hotstar Premium', 'Disney+ Hotstar Premium with all Disney, Marvel, Star Wars, Pixar content and live sports.',
 'Disney+ Hotstar Premium subscription.', 'Within 30 mins', 'Full warranty',
 '["All Disney content","Marvel & Star Wars","Live sports","4K streaming"]'::jsonb,
 '[{"period":"1 Month","price":"৳200"},{"period":"3 Month","price":"৳550"},{"period":"1 Year","price":"৳1900","popular":true}]'::jsonb,
 8, 'in_stock', ''),

-- WINDOWS
('windows-11-pro', 'Windows 11 Pro License Key', '🪟', 'from-sky-500 to-blue-600', 'Windows', 'Lifetime',
 'Windows 11 Pro genuine license', 'Genuine Microsoft Windows 11 Pro retail license key — lifetime activation, all features unlocked.',
 'Genuine Windows 11 Pro key — lifetime activation.', 'Within 1 hour', 'Lifetime warranty',
 '["Genuine Microsoft license","Lifetime activation","Online activation","All Pro features","BitLocker, Hyper-V, Remote Desktop"]'::jsonb,
 '[{"period":"Lifetime — 1 PC","price":"৳600","popular":true},{"period":"Lifetime — 3 PC","price":"৳1500"}]'::jsonb,
 9, 'in_stock', ''),

('windows-10-pro', 'Windows 10 Pro License Key', '💻', 'from-blue-500 to-cyan-600', 'Windows', null,
 'Windows 10 Pro genuine license', 'Genuine Microsoft Windows 10 Pro retail license key — lifetime activation.',
 'Genuine Windows 10 Pro key — lifetime.', 'Within 1 hour', 'Lifetime warranty',
 '["Genuine Microsoft license","Lifetime activation","Online activation"]'::jsonb,
 '[{"period":"Lifetime — 1 PC","price":"৳500","popular":true},{"period":"Lifetime — 3 PC","price":"৳1300"}]'::jsonb,
 10, 'in_stock', ''),

-- OFFICE
('office-365', 'Microsoft Office 365 Subscription', '📊', 'from-orange-500 to-red-600', 'Microsoft Office', 'Bestseller',
 'Office 365 — Word, Excel, PowerPoint, OneDrive', 'Microsoft Office 365 with Word, Excel, PowerPoint, Outlook, OneDrive 1TB and Teams.',
 'Office 365 with 1TB OneDrive.', 'Within 1 hour', 'Full warranty',
 '["Word, Excel, PowerPoint","Outlook & Teams","1TB OneDrive","5 devices","Mobile apps"]'::jsonb,
 '[{"period":"1 Year","price":"৳800","popular":true},{"period":"Lifetime","price":"৳1500"}]'::jsonb,
 11, 'in_stock', ''),

('office-2021', 'Microsoft Office 2021 Lifetime', '📑', 'from-amber-500 to-orange-600', 'Microsoft Office', 'Lifetime',
 'Office 2021 Pro Plus lifetime', 'Microsoft Office 2021 Professional Plus — lifetime license, one-time payment.',
 'Office 2021 Pro Plus — lifetime, 1 PC.', 'Within 1 hour', 'Lifetime warranty',
 '["Word, Excel, PowerPoint","Access, Publisher","Outlook","Lifetime activation"]'::jsonb,
 '[{"period":"Lifetime — 1 PC","price":"৳700","popular":true},{"period":"Lifetime — 3 PC","price":"৳1700"}]'::jsonb,
 12, 'in_stock', ''),

-- AI & EDUCATION
('grammarly-premium', 'Grammarly Premium Price in Bangladesh', '✍️', 'from-emerald-500 to-green-700', 'AI & Education', null,
 'Grammarly Premium — perfect writing', 'Grammarly Premium with advanced grammar, plagiarism checker, tone detector and full-sentence rewrites.',
 'Grammarly Premium account.', 'Within 1 hour', 'Full warranty',
 '["Advanced grammar","Plagiarism checker","Tone detector","Full-sentence rewrites"]'::jsonb,
 '[{"period":"1 Month","price":"৳200"},{"period":"3 Month","price":"৳550"},{"period":"1 Year","price":"৳1500","popular":true}]'::jsonb,
 13, 'in_stock', ''),

('quillbot-premium', 'Quillbot Premium Subscription', '🔄', 'from-teal-500 to-cyan-600', 'AI & Education', null,
 'Quillbot — AI paraphrase & summarize', 'Quillbot Premium with unlimited paraphrase, all writing modes, plagiarism checker.',
 'Quillbot Premium subscription.', 'Within 1 hour', 'Full warranty',
 '["Unlimited paraphrase","All writing modes","Plagiarism checker","Tone & fluency control"]'::jsonb,
 '[{"period":"1 Month","price":"৳150"},{"period":"6 Month","price":"৳700"},{"period":"1 Year","price":"৳1200","popular":true}]'::jsonb,
 14, 'in_stock', ''),

('perplexity-pro', 'Perplexity Pro Subscription', '🔍', 'from-indigo-500 to-purple-700', 'AI & Education', 'Hot',
 'Perplexity Pro — AI research with sources', 'Perplexity Pro with GPT-5, Claude 4, unlimited Pro searches and image generation.',
 'Perplexity Pro 1 year subscription.', 'Within 1 hour', 'Full warranty',
 '["GPT-5 & Claude 4 access","Unlimited Pro searches","Image generation","File analysis"]'::jsonb,
 '[{"period":"1 Year","price":"৳1500","popular":true}]'::jsonb,
 15, 'in_stock', ''),

('coursera-plus', 'Coursera Plus Subscription', '🎓', 'from-blue-500 to-indigo-700', 'AI & Education', null,
 'Coursera Plus — 7000+ courses', 'Coursera Plus with unlimited access to 7000+ courses, certificates and specializations.',
 'Coursera Plus annual subscription.', 'Within 2 hours', 'Full warranty',
 '["7000+ courses","Certificates","Specializations","Top universities"]'::jsonb,
 '[{"period":"1 Month","price":"৳400"},{"period":"1 Year","price":"৳3500","popular":true}]'::jsonb,
 16, 'in_stock', ''),

-- SOFTWARE
('adobe-creative-cloud', 'Adobe Creative Cloud All Apps', '🎭', 'from-red-600 to-rose-800', 'Software & Productivity', 'Premium',
 'Adobe CC — all 20+ apps', 'Adobe Creative Cloud All Apps — Photoshop, Illustrator, Premiere, After Effects, Lightroom and more.',
 'Adobe CC All Apps — full suite.', 'Within 2 hours', 'Full warranty',
 '["All 20+ Adobe apps","Photoshop, Illustrator, Premiere","100GB cloud storage","Adobe Fonts"]'::jsonb,
 '[{"period":"1 Month","price":"৳600"},{"period":"3 Month","price":"৳1600"},{"period":"1 Year","price":"৳5500","popular":true}]'::jsonb,
 17, 'in_stock', ''),

('envato-elements', 'Envato Elements Subscription', '🎁', 'from-emerald-500 to-teal-700', 'Software & Productivity', null,
 'Envato Elements — unlimited assets', 'Envato Elements with unlimited downloads of templates, fonts, photos, videos and audio.',
 'Envato Elements unlimited downloads.', 'Within 1 hour', 'Full warranty',
 '["Unlimited downloads","Templates & fonts","Stock photos & videos","Audio & music"]'::jsonb,
 '[{"period":"1 Month","price":"৳350"},{"period":"3 Month","price":"৳950"},{"period":"1 Year","price":"৳3200","popular":true}]'::jsonb,
 18, 'in_stock', ''),

-- VPN
('nordvpn', 'NordVPN Premium Subscription', '🛡️', 'from-blue-600 to-indigo-800', 'VPN & Security', null,
 'NordVPN — fastest secure VPN', 'NordVPN Premium with 6000+ servers, 6 simultaneous devices, malware protection and dark web monitoring.',
 'NordVPN 1 year / 2 year plan.', 'Within 1 hour', 'Full warranty',
 '["6000+ servers","6 simultaneous devices","Malware protection","No-logs policy"]'::jsonb,
 '[{"period":"1 Year","price":"৳1200"},{"period":"2 Year","price":"৳1800","popular":true}]'::jsonb,
 19, 'in_stock', ''),

('expressvpn', 'ExpressVPN Premium Subscription', '⚡', 'from-rose-500 to-red-700', 'VPN & Security', null,
 'ExpressVPN — premium speed VPN', 'ExpressVPN with servers in 105 countries, lightning fast speed and TrustedServer technology.',
 'ExpressVPN 1 year subscription.', 'Within 1 hour', 'Full warranty',
 '["Servers in 105 countries","Lightning fast speed","TrustedServer tech","5 devices"]'::jsonb,
 '[{"period":"1 Year","price":"৳1500","popular":true}]'::jsonb,
 20, 'in_stock', ''),

('surfshark-vpn', 'Surfshark VPN Subscription', '🦈', 'from-cyan-500 to-blue-700', 'VPN & Security', null,
 'Surfshark — unlimited devices VPN', 'Surfshark VPN with unlimited simultaneous connections, CleanWeb ad blocker and 100+ countries.',
 'Surfshark VPN — unlimited devices.', 'Within 1 hour', 'Full warranty',
 '["Unlimited devices","100+ countries","CleanWeb ad blocker","No-logs policy"]'::jsonb,
 '[{"period":"1 Year","price":"৳800"},{"period":"2 Year","price":"৳1300","popular":true}]'::jsonb,
 21, 'in_stock', ''),

-- GIFTCARDS
('steam-giftcard', 'Steam Wallet Giftcard', '🎮', 'from-slate-700 to-slate-900', 'Giftcards', 'Hot',
 'Steam Wallet — buy any game', 'Steam Wallet gift card — top up your Steam account and buy any game, DLC or in-game item.',
 'Steam wallet codes — instant delivery.', 'Within 30 mins', 'Code warranty',
 '["Instant delivery","Buy any Steam game","DLC & in-game items","No region lock for global codes"]'::jsonb,
 '[{"period":"$5 USD","price":"৳600"},{"period":"$10 USD","price":"৳1200"},{"period":"$20 USD","price":"৳2400"},{"period":"$50 USD","price":"৳5800","popular":true}]'::jsonb,
 22, 'in_stock', ''),

('google-play-giftcard', 'Google Play Giftcard', '📱', 'from-green-500 to-teal-700', 'Giftcards', null,
 'Google Play credit', 'Google Play gift card for Android apps, games, movies, books and Google services.',
 'Google Play credit codes.', 'Within 30 mins', 'Code warranty',
 '["Apps & games","Movies & books","In-app purchases","Google services"]'::jsonb,
 '[{"period":"$5 USD","price":"৳620"},{"period":"$10 USD","price":"৳1230"},{"period":"$25 USD","price":"৳3000","popular":true},{"period":"$50 USD","price":"৳5900"}]'::jsonb,
 23, 'in_stock', ''),

('playstation-giftcard', 'PlayStation Network Giftcard', '🎮', 'from-blue-700 to-indigo-900', 'Giftcards', null,
 'PSN wallet top-up', 'PlayStation Network gift card — top up your PSN wallet for games, PS Plus and more.',
 'PSN gift card codes.', 'Within 30 mins', 'Code warranty',
 '["PS Store games","PS Plus subscription","DLC & add-ons","Movies"]'::jsonb,
 '[{"period":"$10 USD","price":"৳1250"},{"period":"$25 USD","price":"৳3050"},{"period":"$50 USD","price":"৳5950","popular":true}]'::jsonb,
 24, 'in_stock', ''),

('itunes-giftcard', 'Apple iTunes / App Store Giftcard', '🍎', 'from-zinc-500 to-zinc-800', 'Giftcards', null,
 'Apple Gift Card — App Store credit', 'Apple Gift Card — use for App Store, iTunes, Apple Music, iCloud and more.',
 'Apple gift card codes.', 'Within 30 mins', 'Code warranty',
 '["App Store apps","Apple Music & TV+","iCloud storage","In-app purchases"]'::jsonb,
 '[{"period":"$10 USD","price":"৳1280"},{"period":"$25 USD","price":"৳3100"},{"period":"$50 USD","price":"৳6000","popular":true}]'::jsonb,
 25, 'in_stock', '');

-- 4. Seed payment merchant numbers (admin can edit)
INSERT INTO public.admin_records (kind, data, sort_order, is_active) VALUES
  ('payment_method', '{"id":"bkash","name":"bKash","number":"01711-123456","color":"#E2136E","instructions":"Open bKash app → Send Money → enter the number above"}'::jsonb, 1, true),
  ('payment_method', '{"id":"nagad","name":"Nagad","number":"01911-654321","color":"#EC1C24","instructions":"Open Nagad app → Send Money → enter the number above"}'::jsonb, 2, true),
  ('payment_method', '{"id":"rocket","name":"Rocket","number":"01511-987654","color":"#8C3494","instructions":"Open Rocket app → Send Money → enter the number above"}'::jsonb, 3, true)
ON CONFLICT DO NOTHING;

-- 5. Seed shop config (WhatsApp number)
INSERT INTO public.admin_records (kind, data, sort_order, is_active) VALUES
  ('shop_config', '{"whatsapp_number":"8801711000000","shop_name":"AccessNow BD","support_hours":"9 AM – 12 AM"}'::jsonb, 1, true)
ON CONFLICT DO NOTHING;
