export type LegalPageKey = "legal_privacy" | "legal_terms" | "legal_returns";

export type LegalPageContent = {
  title: string;
  metaTitle: string;
  metaDescription: string;
  content: string;
};

export const LEGAL_PAGES: Record<LegalPageKey, LegalPageContent & { path: string }> = {
  legal_privacy: {
    path: "/privacy-policy",
    title: "Privacy Policy",
    metaTitle: "Privacy Policy — Panjabi Shop BD",
    metaDescription: "Panjabi Shop BD কীভাবে গ্রাহকের ব্যক্তিগত তথ্য সংগ্রহ, ব্যবহার ও সুরক্ষিত রাখে তা জানুন।",
    content: "<h2>আপনার গোপনীয়তা আমাদের কাছে গুরুত্বপূর্ণ</h2><p>Panjabi Shop BD-এ অর্ডার করার সময় আপনার নাম, মোবাইল নম্বর, ডেলিভারি ঠিকানা এবং প্রয়োজনীয় অর্ডার তথ্য সংগ্রহ করা হয়। এই তথ্য শুধু অর্ডার নিশ্চিত করা, পণ্য পৌঁছে দেওয়া, গ্রাহকসেবা প্রদান এবং জালিয়াতি প্রতিরোধে ব্যবহার করা হয়।</p><h3>তথ্যের ব্যবহার</h3><ul><li>অর্ডার প্রক্রিয়াকরণ ও ডেলিভারি</li><li>অর্ডারসংক্রান্ত কল বা এসএমএস</li><li>গ্রাহক সহায়তা ও নিরাপত্তা</li><li>আইনগত বাধ্যবাধকতা পালন</li></ul><h3>তথ্যের সুরক্ষা</h3><p>আমরা যুক্তিসঙ্গত প্রযুক্তিগত ও প্রশাসনিক ব্যবস্থা ব্যবহার করে আপনার তথ্য সুরক্ষিত রাখি। প্রয়োজন ছাড়া কোনো তৃতীয় পক্ষের কাছে ব্যক্তিগত তথ্য বিক্রি করা হয় না। ডেলিভারির প্রয়োজনে কুরিয়ার সেবাদাতার সঙ্গে প্রয়োজনীয় তথ্য শেয়ার করা হতে পারে।</p><h3>যোগাযোগ</h3><p>এই নীতিমালা বা আপনার তথ্য সম্পর্কে প্রশ্ন থাকলে আমাদের সাপোর্ট নম্বর বা ইমেইলে যোগাযোগ করুন।</p>",
  },
  legal_terms: {
    path: "/terms-and-conditions",
    title: "Terms & Conditions",
    metaTitle: "Terms & Conditions — Panjabi Shop BD",
    metaDescription: "Panjabi Shop BD থেকে পাঞ্জাবি অর্ডার, মূল্য, ডেলিভারি, পেমেন্ট ও ব্যবহারের শর্তাবলি পড়ুন।",
    content: "<h2>অর্ডারের শর্তাবলি</h2><p>Panjabi Shop BD-এ অর্ডার করার মাধ্যমে আপনি এই শর্তাবলিতে সম্মতি দিচ্ছেন। পণ্যের ছবি ও রঙ যতটা সম্ভব সঠিকভাবে দেখানো হয়; তবে স্ক্রিন ও আলোর পার্থক্যে সামান্য ভিন্নতা হতে পারে।</p><h3>মূল্য ও পেমেন্ট</h3><p>ওয়েবসাইটে প্রদর্শিত মূল্য বাংলাদেশি টাকায়। প্রযোজ্য ডেলিভারি চার্জ অর্ডার নিশ্চিত করার আগে দেখানো হবে। ক্যাশ অন ডেলিভারি বা উপলভ্য অনুমোদিত পেমেন্ট পদ্ধতিতে মূল্য পরিশোধ করা যাবে।</p><h3>অর্ডার ও ডেলিভারি</h3><p>স্টক, ঠিকানা যাচাই এবং যোগাযোগ সফল হওয়ার ওপর অর্ডার গ্রহণ নির্ভর করে। ভুল বা অসম্পূর্ণ তথ্যের কারণে ডেলিভারিতে বিলম্ব হলে Panjabi Shop BD দায়ী থাকবে না।</p><h3>ব্যবহারবিধি</h3><p>ভুয়া অর্ডার, প্রতারণামূলক কার্যক্রম বা সেবার অপব্যবহার শনাক্ত হলে অর্ডার বাতিল বা ভবিষ্যৎ অর্ডার সীমিত করা হতে পারে।</p>",
  },
  legal_returns: {
    path: "/return-policy",
    title: "Return Policy",
    metaTitle: "Return Policy — Panjabi Shop BD",
    metaDescription: "Panjabi Shop BD-এর পাঞ্জাবি পরিবর্তন, ফেরত, ত্রুটিপূর্ণ পণ্য ও রিফান্ডের নিয়ম জানুন।",
    content: "<h2>রিটার্ন ও এক্সচেঞ্জ</h2><p>ভুল পণ্য, ভুল সাইজ বা উৎপাদনজনিত ত্রুটি থাকলে পণ্য হাতে পাওয়ার ৭ দিনের মধ্যে আমাদের সঙ্গে যোগাযোগ করুন। পণ্যটি অব্যবহৃত, অপরিষ্কার, অক্ষত এবং মূল ট্যাগ ও প্যাকেজিংসহ থাকতে হবে।</p><h3>যেভাবে অনুরোধ করবেন</h3><ol><li>অর্ডার নম্বরসহ সাপোর্ট টিমে যোগাযোগ করুন।</li><li>সমস্যাটি স্পষ্ট দেখা যায় এমন ছবি বা ভিডিও দিন।</li><li>আমাদের নির্দেশনা অনুযায়ী পণ্যটি ফেরত পাঠান।</li></ol><h3>যেসব ক্ষেত্রে রিটার্ন প্রযোজ্য নয়</h3><p>ব্যবহৃত, ধোয়া, সুগন্ধি বা দাগযুক্ত, পরিবর্তন করা কিংবা ট্যাগবিহীন পণ্য ফেরত নেওয়া হবে না। শুধু পছন্দ পরিবর্তনের ক্ষেত্রে ফেরত ডেলিভারি খরচ গ্রাহককে বহন করতে হতে পারে।</p><h3>রিফান্ড</h3><p>ফেরত পণ্য যাচাইয়ের পর প্রযোজ্য রিফান্ড অনুমোদিত পেমেন্ট মাধ্যমে সম্পন্ন করা হবে। ব্যাংক বা মোবাইল আর্থিক সেবার প্রক্রিয়াকরণে অতিরিক্ত সময় লাগতে পারে।</p>",
  },
};

export function readLegalPage(
  key: LegalPageKey,
  raw: Record<string, unknown> | undefined,
): LegalPageContent {
  const fallback = LEGAL_PAGES[key];
  const text = (name: string, defaultValue: string) => {
    const value = raw?.[name];
    return typeof value === "string" && value.trim() ? value : defaultValue;
  };
  return {
    title: text("title", fallback.title),
    metaTitle: text("meta_title", fallback.metaTitle),
    metaDescription: text("meta_description", fallback.metaDescription),
    content: text("content", fallback.content),
  };
}