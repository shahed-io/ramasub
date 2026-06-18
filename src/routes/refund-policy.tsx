import { createFileRoute, Link } from "@tanstack/react-router";
import { PolicyPage } from "@/components/PolicyPage";

export const Route = createFileRoute("/refund-policy")({
  component: RefundPolicyPage,
  head: () => ({
    meta: [
      { title: "Refund & Return Policy — AccessNow BD" },
      { name: "description", content: "30-day warranty, replacement and refund policy for digital subscriptions." },
      { property: "og:title", content: "Refund & Return Policy — AccessNow BD" },
      { property: "og:description", content: "Our hassle-free refund and replacement policy." },
    ],
  }),
});

function RefundPolicyPage() {
  return (
    <PolicyPage
      title="Refund & Return Policy"
      eyebrow="30-day full warranty"
      subtitle="AccessNow BD-এ প্রতিটি অর্ডারে রয়েছে ৩০ দিনের সম্পূর্ণ ওয়ারেন্টি — দ্রুত রিপ্লেসমেন্ট অথবা ১০০% টাকা ফেরতের নিশ্চয়তা।"
    >
      <h2>ওয়ারেন্টি কভারেজ</h2>
      <ul>
        <li><strong>অ্যাকাউন্ট লগইন কাজ না করলে:</strong> সাথে সাথে নতুন অ্যাকাউন্ট রিপ্লেসমেন্ট।</li>
        <li><strong>সাবস্ক্রিপশন মেয়াদের আগে বন্ধ হলে:</strong> রিমেইনিং সময়ের জন্য রিপ্লেসমেন্ট বা প্রপোর্শনাল রিফান্ড।</li>
        <li><strong>রিপ্লেসমেন্ট সম্ভব না হলে:</strong> ১০০% টাকা ফেরত — কোনো প্রশ্ন ছাড়াই।</li>
        <li>৩০ দিন পূর্ণ সময় জুড়ে যেকোনো টেকনিক্যাল ইস্যুতে কভারেজ।</li>
      </ul>

      <h2>রিফান্ড পাওয়ার যোগ্যতা</h2>
      <ul>
        <li>অ্যাকাউন্টের <strong>পাসওয়ার্ড, ইমেইল বা প্রোফাইল নাম পরিবর্তন করেননি</strong>।</li>
        <li>প্রোডাক্ট পেজে দেওয়া ব্যবহারবিধি সঠিকভাবে অনুসরণ করেছেন।</li>
        <li>VPN বা সন্দেহজনক লোকেশন ব্যবহার করেননি।</li>
        <li>সমস্যাটি ৩০ দিনের ওয়ারেন্টি পিরিয়ডের মধ্যে রিপোর্ট করেছেন।</li>
      </ul>

      <h2>রিফান্ড প্রক্রিয়া</h2>
      <ul>
        <li><strong>ধাপ ১:</strong> WhatsApp বা ইমেইলে অর্ডার আইডি ও সমস্যার বিবরণ পাঠান।</li>
        <li><strong>ধাপ ২:</strong> আমাদের টিম দ্রুত যাচাই করবে — সাধারণত ২–৬ ঘণ্টা।</li>
        <li><strong>ধাপ ৩:</strong> ভেরিফিকেশনের পর <strong>২৪–৭২ ঘণ্টা</strong>র মধ্যে আপনার মূল পেমেন্ট মেথডে (BKash/Nagad/কার্ড) টাকা ফেরত যাবে।</li>
      </ul>

      <h2>যেসব ক্ষেত্রে রিফান্ড প্রযোজ্য নয়</h2>
      <ul>
        <li>প্রোডাক্ট সঠিকভাবে ডেলিভারি হওয়ার পর গ্রাহকের ভুলে অ্যাকাউন্ট ব্যান হলে।</li>
        <li>প্রোডাক্টের বিবরণ না পড়ে ভুল প্ল্যান কেনার পরে ব্যবহার শুরু করলে।</li>
        <li>৩০ দিন পেরিয়ে যাওয়ার পরে অভিযোগ করলে।</li>
      </ul>

      <h2>দ্রুত রিকোয়েস্ট করুন</h2>
      <p>
        রিফান্ড পেতে এখনই ভিজিট করুন{" "}
        <Link to="/refund-request">Refund Request পেজ</Link> অথবা WhatsApp করুন{" "}
        <a href="https://wa.me/8801580607614" target="_blank" rel="noreferrer">+880 1580-607614</a>।
      </p>
    </PolicyPage>
  );
}
