import { createFileRoute } from "@tanstack/react-router";
import { PolicyPage } from "@/components/PolicyPage";

export const Route = createFileRoute("/delivery-info")({
  component: DeliveryInfoPage,
  head: () => ({
    meta: [
      { title: "Delivery Info — AccessNow BD" },
      { name: "description", content: "Digital delivery times and process for AccessNow BD orders." },
      { property: "og:title", content: "Delivery Info — AccessNow BD" },
      { property: "og:description", content: "Fast digital delivery — usually 10-30 minutes." },
    ],
  }),
});

function DeliveryInfoPage() {
  return (
    <PolicyPage
      title="Delivery Information"
      eyebrow="Instant digital delivery"
      subtitle="অর্ডার করার পরে অপেক্ষার শেষ — সাধারণত ১০–৩০ মিনিটেই আপনার ইনবক্সে চলে যাবে অ্যাকাউন্ট তথ্য। বিস্তারিত নিচে দেখুন।"
    >
      <h2>ডেলিভারি টাইম</h2>
      <ul>
        <li><strong>অফিস আওয়ার (১১ AM – ১১ PM):</strong> মাত্র ১০–৩০ মিনিট।</li>
        <li><strong>মধ্যরাত / অফ-আওয়ার:</strong> সর্বোচ্চ ৩ ঘণ্টা।</li>
        <li><strong>ছুটির দিন:</strong> WhatsApp-এ ২৪/৭ সাপোর্ট সক্রিয় — কোনো গ্যাপ নেই।</li>
        <li><strong>প্রি-অর্ডার বা সীমিত স্টক প্রোডাক্ট:</strong> প্রোডাক্ট পেজে আলাদা ডেলিভারি টাইম উল্লেখ থাকে।</li>
      </ul>

      <h2>ডেলিভারি প্রক্রিয়া</h2>
      <ul>
        <li><strong>ধাপ ১:</strong> অর্ডার সম্পন্ন করুন এবং পেমেন্ট কনফার্ম করুন।</li>
        <li><strong>ধাপ ২:</strong> আমাদের টিম দ্রুত অ্যাকাউন্ট ভেরিফাই করে রেডি করে।</li>
        <li><strong>ধাপ ৩:</strong> অ্যাকাউন্ট তথ্য পাঠানো হবে <strong>Email + WhatsApp + Dashboard</strong> — তিন জায়গাতেই।</li>
        <li><strong>ধাপ ৪:</strong> <em>"My Orders"</em> পেজ থেকেও যেকোনো সময় অ্যাকাউন্ট তথ্য দেখতে পারবেন।</li>
      </ul>

      <h2>ডেলিভারি কোথায় কোথায় পাঠানো হয়</h2>
      <ul>
        <li>রেজিস্টার্ড ইমেইলে — মূল অ্যাকাউন্ট ক্রেডেনশিয়ালস।</li>
        <li>WhatsApp মোবাইল নম্বরে — কুইক অ্যাক্সেস ও সাপোর্ট চ্যানেল।</li>
        <li>AccessNow BD অ্যাকাউন্টের <em>Orders</em> সেকশনে — ব্যাকআপ হিসেবে সর্বদা সংরক্ষিত।</li>
      </ul>

      <h2>সমস্যা হলে কী করবেন</h2>
      <ul>
        <li>ডেলিভারিতে দেরি হলে — সাথে সাথে WhatsApp-এ যোগাযোগ করুন।</li>
        <li>অ্যাকাউন্ট কাজ না করলে — অর্ডার আইডি দিয়ে রিপোর্ট করুন, দ্রুত রিপ্লেসমেন্ট পাবেন।</li>
        <li>ইমেইলে না এলে স্প্যাম/প্রমোশন ফোল্ডার চেক করুন।</li>
      </ul>

      <h2>২৪/৭ সাপোর্ট</h2>
      <p>
        WhatsApp: <a href="https://wa.me/8801580607614" target="_blank" rel="noreferrer">+880 1580-607614</a> · Email:{" "}
        <a href="mailto:support@accessnowbd.com">support@accessnowbd.com</a> — যেকোনো সমস্যায় আপনার পাশে।
      </p>
    </PolicyPage>
  );
}
