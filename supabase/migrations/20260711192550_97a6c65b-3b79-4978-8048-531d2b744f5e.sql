DO $$
DECLARE
  articles jsonb := jsonb_build_array(
    jsonb_build_object('title','Order দেওয়ার পর কতক্ষণে account পাব?','slug','order-delivery-time','category','orders','excerpt','সাধারণত 10–30 মিনিটে delivery হয়। Office hours-এ (11 AM – 11 PM) সবচেয়ে fast।','body','<p>Rama Sub-এ আপনার order confirm হওয়ার পর আমরা <strong>10–30 মিনিটের</strong> মধ্যেই account/login details আপনার email এবং dashboard-এ পাঠিয়ে দিই।</p><h2>Timing বিস্তারিত</h2><ul><li><strong>Office hours (11 AM – 11 PM):</strong> সর্বোচ্চ 30 মিনিট</li><li><strong>Late night / rush hour:</strong> সর্বোচ্চ 2–3 ঘণ্টা</li></ul><p>Delay হলে আমাদের WhatsApp-এ (01601-048085) মেসেজ দিন।</p>','tags','delivery, time, order','is_featured',true),
    jsonb_build_object('title','bKash / Nagad-এ payment কীভাবে করব?','slug','bkash-nagad-payment-guide','category','payment','excerpt','Send Money option ব্যবহার করে আমাদের number-এ payment করুন, তারপর TrxID form-এ paste করুন।','body','<h2>Step-by-step guide</h2><ol><li>Product select করুন এবং "Buy Now" চাপুন।</li><li>Checkout page-এ bKash অথবা Nagad select করুন।</li><li>bKash/Nagad app-এ <strong>Send Money</strong> option-এ যান।</li><li>দেখানো number-এ exact amount send করুন।</li><li>Transaction ID (TrxID) form-এ paste করে submit করুন।</li></ol><p>Payment verify হলে 10–30 মিনিটে account delivery হবে।</p>','tags','bkash, nagad, payment','is_featured',true),
    jsonb_build_object('title','Warranty কতদিনের এবং কী কী cover করে?','slug','warranty-policy','category','warranty','excerpt','30 দিনের full warranty — account কাজ না করলে replacement অথবা refund।','body','<h2>Warranty terms</h2><ul><li><strong>Duration:</strong> 30 দিন</li><li><strong>Cover:</strong> Account lock, login না হওয়া, subscription expire</li><li><strong>Solution:</strong> Instant replacement অথবা full refund</li></ul><h2>Cover করে না</h2><ul><li>নিজে password change করে ফেললে (shared account হলে)</li><li>Terms violation (mass share, resale)</li></ul>','tags','warranty, refund','is_featured',true),
    jsonb_build_object('title','Account login না হলে কী করব?','slug','account-login-not-working','category','technical','excerpt','Browser cache clear করুন, incognito-তে try করুন। কাজ না হলে WhatsApp করুন।','body','<h2>Troubleshoot steps</h2><ol><li><strong>Cache clear:</strong> Browser settings → Clear browsing data</li><li>Incognito/Private mode-এ try করুন</li><li>VPN off রাখুন</li><li>Different browser (Chrome/Edge/Firefox) try করুন</li></ol><p>উপরের কোনোটা কাজ না করলে WhatsApp-এ order ID সহ মেসেজ দিন।</p>','tags','login, troubleshoot'),
    jsonb_build_object('title','একই account কতজন ব্যবহার করতে পারব?','slug','account-sharing-limit','category','subscription','excerpt','Product অনুযায়ী আলাদা। Product page-এর Features section-এ clearly লেখা থাকে।','body','<p>প্রতিটি subscription-এর sharing limit ভিন্ন:</p><ul><li><strong>Shared / Family plans:</strong> 4–5 জন (আলাদা profile)</li><li><strong>Private plans:</strong> শুধু আপনি — password change করা যাবে</li><li><strong>1-screen plans:</strong> একই সময়ে 1টি device</li></ul>','tags','sharing, family'),
    jsonb_build_object('title','Refund কীভাবে পাব এবং কতদিন লাগে?','slug','refund-process','category','warranty','excerpt','Refund request-এর 24 ঘণ্টার মধ্যে wallet অথবা bKash-এ টাকা পৌঁছে যাবে।','body','<h2>Refund কীভাবে চাইব</h2><ol><li>Dashboard → My Orders → order select করুন</li><li>"Request refund" চাপুন</li><li>অথবা WhatsApp-এ order ID পাঠান</li></ol><h2>Refund method</h2><ul><li><strong>Wallet credit (instant):</strong> পরের order-এ ব্যবহার করা যাবে</li><li><strong>bKash/Nagad (24 hours):</strong> মূল payment number-এ ফেরত</li></ul>','tags','refund'),
    jsonb_build_object('title','Order cancel করতে চাই','slug','cancel-order','category','orders','excerpt','Delivery হওয়ার আগে WhatsApp-এ মেসেজ দিলে cancel + full refund।','body','<p>Delivery হওয়ার আগে (credentials পাঠানোর আগে) order cancel করতে পারবেন।</p><h2>Cancel process</h2><ol><li>WhatsApp-এ order ID পাঠান</li><li>"Cancel" লিখুন</li><li>15 মিনিটে confirmation পাবেন</li></ol><p>Payment instant refund হবে wallet-এ, অথবা 24 ঘণ্টায় bKash/Nagad-এ।</p>','tags','cancel'),
    jsonb_build_object('title','Invoice/receipt কোথায় পাব?','slug','invoice-receipt','category','account','excerpt','Order complete হওয়ার সাথে সাথে email-এ automatic invoice চলে যাবে।','body','<p>প্রতিটি order-এর জন্য automatic PDF invoice generate করি:</p><ul><li><strong>Email:</strong> Order confirm-এর সাথে সাথে</li><li><strong>Dashboard:</strong> My Orders → Download invoice</li></ul><p>Email না পেলে spam folder check করুন।</p>','tags','invoice, receipt')
  );
  a jsonb;
  s text;
  next_sort int;
BEGIN
  SELECT COALESCE(MAX(sort_order), -1) + 1 INTO next_sort FROM public.admin_records WHERE kind = 'help_article';
  FOR a IN SELECT * FROM jsonb_array_elements(articles)
  LOOP
    s := a->>'slug';
    IF NOT EXISTS (SELECT 1 FROM public.admin_records WHERE kind='help_article' AND (data->>'slug')=s) THEN
      INSERT INTO public.admin_records (kind, data, is_active, sort_order)
      VALUES ('help_article', a, true, next_sort);
      next_sort := next_sort + 1;
    END IF;
  END LOOP;
END $$;