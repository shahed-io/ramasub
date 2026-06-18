import { createFileRoute } from "@tanstack/react-router";
import { PolicyPage } from "@/components/PolicyPage";

export const Route = createFileRoute("/order-cancellation")({
  component: OrderCancellationPage,
  head: () => ({
    meta: [
      { title: "Order & Cancellation Policy — AccessNow BD" },
      { name: "description", content: "How to cancel your order and our cancellation policy." },
      { property: "og:title", content: "Order & Cancellation — AccessNow BD" },
      { property: "og:description", content: "Order cancellation rules and procedures." },
    ],
  }),
});

function OrderCancellationPage() {
  return (
    <PolicyPage
      title="Order & Cancellation Policy"
      eyebrow="Flexible · Transparent"
      subtitle="অর্ডার ক্যান্সেল করতে চান? নিচে ধাপে ধাপে দেওয়া আছে কখন, কীভাবে এবং কী শর্তে ক্যান্সেলেশন প্রযোজ্য।"
    >
      <h2>কখন ক্যান্সেল করা যাবে</h2>
      <ul>
        <li><strong>ডেলিভারির আগে:</strong> অ্যাকাউন্ট তথ্য পাঠানোর পূর্বে অর্ডার ক্যান্সেল করলে — <strong>১০০% টাকা ফেরত</strong>।</li>
        <li><strong>ডেলিভারির পরে:</strong> অ্যাকাউন্ট কাজ না করলে বা সমস্যা থাকলে আমাদের ৩০ দিনের ওয়ারেন্টি প্রযোজ্য — রিপ্লেসমেন্ট অথবা রিফান্ড।</li>
        <li><strong>অর্ডার শুরু হওয়ার পর শুধু পছন্দ না হলে:</strong> ডিজিটাল প্রোডাক্ট হওয়ায় এক্ষেত্রে রিফান্ড নাও হতে পারে — তবে আমরা প্রতিটি কেস ম্যানুয়ালি রিভিউ করি।</li>
      </ul>

      <h2>ক্যান্সেলেশনের কারণসমূহ</h2>
      <ul>
        <li>ভুল প্রোডাক্ট বা ভুল প্ল্যান অর্ডার করা।</li>
        <li>ডেলিভারিতে অস্বাভাবিক দেরি (৩+ ঘণ্টা)।</li>
        <li>পেমেন্ট ডাবল হয়ে গেলে।</li>
        <li>পরিকল্পনা পরিবর্তন।</li>
      </ul>

      <h2>ক্যান্সেল কীভাবে করবেন</h2>
      <ul>
        <li><strong>ধাপ ১:</strong> WhatsApp-এ মেসেজ দিন — <a href="https://wa.me/8801580607614" target="_blank" rel="noreferrer">+880 1580-607614</a></li>
        <li><strong>ধাপ ২:</strong> আপনার <strong>Order ID</strong> ও পেমেন্ট মেথড উল্লেখ করুন।</li>
        <li><strong>ধাপ ৩:</strong> সংক্ষেপে ক্যান্সেলের কারণ জানান।</li>
        <li><strong>ধাপ ৪:</strong> কনফার্মেশন ম্যাসেজ পেলে অপেক্ষা করুন — রিফান্ড স্ট্যাটাস আপডেট পাবেন।</li>
      </ul>

      <h2>রিফান্ডের সময়সীমা</h2>
      <p>
        ক্যান্সেলেশন কনফার্ম হওয়ার পর <strong>২৪–৭২ ঘণ্টার</strong> মধ্যে আপনার মূল পেমেন্ট মেথডে (BKash/Nagad/কার্ড) সম্পূর্ণ টাকা ফেরত যাবে। ব্যাংক প্রসেসিং টাইমের কারণে কার্ডে কখনও সর্বোচ্চ ৫ কার্যদিবস লাগতে পারে।
      </p>

      <h2>সাহায্য দরকার?</h2>
      <p>
        ক্যান্সেলেশন বা রিফান্ড সংক্রান্ত যেকোনো প্রশ্নে ২৪/৭ যোগাযোগ করুন{" "}
        <a href="mailto:support@accessnowbd.com">support@accessnowbd.com</a> — আমাদের টিম সর্বদা আপনার পাশে।
      </p>
    </PolicyPage>
  );
}
