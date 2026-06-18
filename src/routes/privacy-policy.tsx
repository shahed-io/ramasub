import { createFileRoute } from "@tanstack/react-router";
import { PolicyPage } from "@/components/PolicyPage";

export const Route = createFileRoute("/privacy-policy")({
  component: PrivacyPolicyPage,
  head: () => ({
    meta: [
      { title: "Privacy Policy — AccessNow BD" },
      { name: "description", content: "How AccessNow BD collects, uses, and protects your personal information." },
      { property: "og:title", content: "Privacy Policy — AccessNow BD" },
      { property: "og:description", content: "Read our privacy practices for orders, payments and account data." },
    ],
  }),
});

function PrivacyPolicyPage() {
  return (
    <PolicyPage
      title="Privacy Policy"
      eyebrow="Your data · Your control"
      subtitle="AccessNow BD-তে আপনার ব্যক্তিগত তথ্যের গোপনীয়তা ও নিরাপত্তা আমাদের কাছে সবচেয়ে গুরুত্বপূর্ণ। নিচে বিস্তারিতভাবে আমাদের প্রাইভেসি অনুশীলন তুলে ধরা হলো।"
    >
      <h2>আমরা কী তথ্য সংগ্রহ করি</h2>
      <ul>
        <li><strong>পরিচয় তথ্য:</strong> নাম, ইমেইল, মোবাইল নম্বর — অর্ডার কনফার্মেশন ও সাপোর্ট সেবার জন্য।</li>
        <li><strong>পেমেন্ট তথ্য:</strong> BKash/Nagad/কার্ড লেনদেন সম্পন্ন করার জন্য সুরক্ষিত গেটওয়ের মাধ্যমে — আমরা কখনোই আপনার কার্ড নম্বর বা PIN সংরক্ষণ করি না।</li>
        <li><strong>অর্ডার ইতিহাস:</strong> কোন প্রোডাক্ট কিনেছেন, কখন ডেলিভারি হয়েছে — ওয়ারেন্টি ও পুনরায় সাপোর্টের জন্য।</li>
        <li><strong>ডিভাইস ও ব্রাউজিং তথ্য:</strong> IP, ব্রাউজার টাইপ, ভিজিটেড পেজ — সাইটের নিরাপত্তা ও অভিজ্ঞতা উন্নত করতে।</li>
      </ul>

      <h2>আমরা তথ্য কীভাবে ব্যবহার করি</h2>
      <ul>
        <li>অর্ডার প্রসেসিং, দ্রুত ডিজিটাল ডেলিভারি এবং অর্ডার আপডেট পাঠাতে।</li>
        <li>৩০ দিনের ওয়ারেন্টি, রিপ্লেসমেন্ট ও রিফান্ড সার্ভিস নিশ্চিত করতে।</li>
        <li>২৪/৭ কাস্টমার সাপোর্ট ও টেকনিক্যাল হেল্প প্রদানে।</li>
        <li>আপনার সম্মতি থাকলে নতুন অফার, ডিসকাউন্ট ও প্রোডাক্ট আপডেট জানাতে।</li>
        <li>প্রতারণা প্রতিরোধ ও অ্যাকাউন্টের নিরাপত্তা মনিটর করতে।</li>
      </ul>

      <h2>তথ্যের সুরক্ষা</h2>
      <p>
        সকল পেমেন্ট ও সংবেদনশীল ডেটা <strong>SSL এনক্রিপশন</strong> ও সিকিউর ক্লাউড স্টোরেজের মাধ্যমে সংরক্ষিত। কেবলমাত্র অনুমোদিত স্টাফ অপারেশনাল কাজে এই ডেটা অ্যাক্সেস করতে পারেন এবং সকলেই কঠোর নন-ডিসক্লোজার নীতিতে আবদ্ধ।
      </p>

      <h2>তথ্য শেয়ারিং</h2>
      <p>
        আমরা <strong>কখনোই</strong> আপনার ব্যক্তিগত তথ্য তৃতীয় পক্ষের কাছে বিক্রি বা ভাড়া দিই না। শুধুমাত্র পেমেন্ট গেটওয়ে (BKash, Nagad, SSLCommerz) এবং অর্ডার সংক্রান্ত পার্টনারদের সাথে প্রয়োজনীয় ন্যূনতম তথ্য শেয়ার হয় — সম্পূর্ণ সিকিউর চ্যানেলে।
      </p>

      <h2>কুকিজ ও ট্র্যাকিং</h2>
      <p>
        সাইট অভিজ্ঞতা ব্যক্তিগতকরণ, কার্ট মনে রাখা ও পারফরম্যান্স অ্যানালিটিক্সের জন্য আমরা সীমিত কুকিজ ব্যবহার করি। আপনি ব্রাউজার সেটিং থেকে যেকোনো সময় তা ম্যানেজ বা বন্ধ করতে পারেন।
      </p>

      <h2>আপনার অধিকার</h2>
      <ul>
        <li>যেকোনো সময় আপনার সংরক্ষিত তথ্যের কপি চাইতে পারেন।</li>
        <li>ভুল তথ্য সংশোধন বা অ্যাকাউন্ট সম্পূর্ণ ডিলিট করার অনুরোধ জানাতে পারেন।</li>
        <li>প্রোমোশনাল মেসেজ থেকে যেকোনো সময় আনসাবস্ক্রাইব করতে পারেন।</li>
      </ul>

      <h2>যোগাযোগ</h2>
      <p>
        প্রাইভেসি সংক্রান্ত যেকোনো প্রশ্নে ইমেইল করুন{" "}
        <a href="mailto:support@accessnowbd.com">support@accessnowbd.com</a> অথবা WhatsApp করুন{" "}
        <a href="https://wa.me/8801580607614" target="_blank" rel="noreferrer">+880 1580-607614</a>।
      </p>
    </PolicyPage>
  );
}
