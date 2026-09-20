import { Phone } from "lucide-react";

export const SOCIAL_LINKS = [
  {
    key: "phone",
    href: "tel:+8801772588538",
    label: "Call",
    icon: PhoneIcon,
    colorClass: "text-emerald-600 hover:text-emerald-700",
  },
  {
    key: "facebook",
    href: "https://www.facebook.com/people/Panjabi-Shop-Bd/61587745228833/",
    label: "Facebook",
    icon: FacebookIcon,
    colorClass: "text-[#1877F2] hover:text-[#0d65d9]",
  },
  {
    key: "whatsapp",
    href: "https://wa.me/8801772588538",
    label: "WhatsApp",
    icon: WhatsAppIcon,
    colorClass: "text-[#25D366] hover:text-[#128C7E]",
  },
];

function PhoneIcon({ className }: { className?: string }) {
  return <Phone className={className} strokeWidth={2} />;
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.33 4.95L2.05 22l5.25-1.37a9.91 9.91 0 0 0 4.74 1.2c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm5.66 13.38c-.24.68-1.19 1.25-1.68 1.33-.45.07-1 .1-1.61-.03-.37-.08-.85-.2-1.43-.4-2.69-.93-4.44-3.1-4.57-3.25-.13-.15-1.1-1.46-1.1-2.79 0-1.33.69-1.97.93-2.24.24-.27.53-.34.71-.34.18 0 .36 0 .52.01.17.01.39-.06.61.47.22.55.76 1.91.83 2.05.07.14.12.3.02.48-.1.18-.15.29-.29.45-.14.15-.29.32-.41.43-.12.11-.25.23-.11.45.14.22.63 1.04 1.36 1.69.93.82 1.72 1.08 2.1 1.2.25.08.43.06.59-.09.16-.15.67-.78.85-1.05.18-.27.36-.22.61-.13.25.09 1.58.74 1.85.88.27.13.45.2.52.31.06.11.06.64-.18 1.32z" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M24 12.073C24 5.403 18.627 0 12 0S0 5.403 0 12.073C0 18.098 4.388 23.093 10.125 24v-8.437H7.078v-3.49h3.047v-2.66c0-3.025 1.79-4.697 4.533-4.697 1.313 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.93-1.956 1.887v2.282h3.328l-.532 3.49h-2.796V24C19.612 23.093 24 18.098 24 12.073" />
    </svg>
  );
}
