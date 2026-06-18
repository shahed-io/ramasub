import { createFileRoute, Link } from "@tanstack/react-router";
import { PolicyPage } from "@/components/PolicyPage";

export const Route = createFileRoute("/refund-request")({
  component: RefundRequestPage,
  head: () => ({
    meta: [
      { title: "Refund Request — AccessNow BD" },
      { name: "description", content: "Request a refund for your AccessNow BD order." },
      { property: "og:title", content: "Refund Request — AccessNow BD" },
      { property: "og:description", content: "Submit your refund request quickly." },
    ],
  }),
});

function RefundRequestPage() {
  return (
    <PolicyPage
      title="Refund Request"
      eyebrow="Fast · Hassle-free"
      subtitle="রিফান্ড পেতে চান? নিচের যেকোনো একটি দ্রুত চ্যানেলে যোগাযোগ করুন — আমাদের টিম ২৪/৭ আপনার পাশে আছে।"
    >
      <h2>WhatsApp-এ যোগাযোগ (সবচেয়ে দ্রুত)</h2>
      <p>
        সরাসরি মেসেজ করুন —{" "}
        <a href="https://wa.me/8801580607614" target="_blank" rel="noreferrer">
          +880 1580-607614
        </a>
        । সাধারণত ৫–১৫ মিনিটের মধ্যে রিপ্লাই পাবেন।
      </p>

      <h2>ইমেইল সাপোর্ট</h2>
      <p>
        বিস্তারিত বর্ণনাসহ পাঠান —{" "}
        <a href="mailto:support@accessnowbd.com">support@accessnowbd.com</a>। উত্তর সাধারণত ২–৬ ঘণ্টার মধ্যে।
      </p>

      <h2>রিকোয়েস্টে যা যা উল্লেখ করবেন</h2>
      <ul>
        <li><strong>Order ID:</strong> ড্যাশবোর্ড বা ইমেইল কনফার্মেশন থেকে কপি করুন।</li>
        <li><strong>প্রোডাক্টের নাম:</strong> যেমন Netflix 1 Month, ChatGPT Plus 1 Month ইত্যাদি।</li>
        <li><strong>সমস্যার বিস্তারিত:</strong> কী সমস্যা হচ্ছে — সংক্ষেপে স্পষ্টভাবে।</li>
        <li><strong>পেমেন্ট মেথড:</strong> BKash/Nagad নম্বর বা কার্ডের শেষ ৪ ডিজিট — রিফান্ড পাঠানোর জন্য।</li>
        <li>সম্ভব হলে স্ক্রিনশট সংযুক্ত করুন — দ্রুত সমাধানে সাহায্য করবে।</li>
      </ul>

      <h2>প্রক্রিয়া ও সময়সীমা</h2>
      <ul>
        <li><strong>ভেরিফিকেশন:</strong> সাধারণত ২–৬ ঘণ্টা।</li>
        <li><strong>অনুমোদন:</strong> যোগ্য হলে ২৪ ঘণ্টার মধ্যে কনফার্মেশন।</li>
        <li><strong>টাকা ফেরত:</strong> ২৪–৭২ ঘণ্টার মধ্যে আপনার মূল পেমেন্ট মেথডে।</li>
      </ul>

      <h2>স্বচ্ছ ও নিরাপদ প্রতিশ্রুতি</h2>
      <p>
        AccessNow BD প্রতিটি রিফান্ড রিকোয়েস্ট ব্যক্তিগতভাবে রিভিউ করে। আপনার তথ্য সুরক্ষিত থাকবে এবং অযৌক্তিকভাবে কোনো রিকোয়েস্ট খারিজ করা হবে না।
      </p>

      <p>
        বিস্তারিত পলিসি দেখতে ভিজিট করুন{" "}
        <Link to="/refund-policy">Refund & Return Policy পেজ</Link>।
      </p>
    </PolicyPage>
  );
}
