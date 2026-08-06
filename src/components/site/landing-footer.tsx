import { Phone } from "lucide-react";

import { useLang } from "@/lib/language-context";
import logoMark from "@/assets/upoharkabbo-logo.png";
import { cn } from "@/lib/utils";

const SOCIAL_LINKS = [
  {
    key: "phone",
    href: "tel:+8801338125069",
    label: "Call",
    icon: PhoneIcon,
    colorClass: "text-emerald-600 hover:text-emerald-700",
  },
  {
    key: "whatsapp",
    href: "https://wa.me/8801338125069",
    label: "WhatsApp",
    icon: WhatsAppIcon,
    colorClass: "text-[#25D366] hover:text-[#128C7E]",
  },
  {
    key: "facebook",
    href: "https://www.facebook.com/upoharkabbo",
    label: "Facebook",
    icon: FacebookIcon,
    colorClass: "text-[#1877F2] hover:text-[#0d65d9]",
  },
  {
    key: "instagram",
    href: "https://www.instagram.com/upohar_kabbo",
    label: "Instagram",
    icon: InstagramIcon,
    colorClass: "",
  },
  {
    key: "tiktok",
    href: "https://www.tiktok.com/@upoharkabbo3",
    label: "TikTok",
    icon: TikTokIcon,
    colorClass: "text-[#000000] hover:text-[#ff0050]",
  },
];

function PhoneIcon({ className }: { className?: string }) {
  return <Phone className={className} strokeWidth={2} />;
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.521.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.521-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.521.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-7.43A9.89 9.89 0 0 0 12 2.036c-5.49 0-9.944 4.454-9.944 9.944 0 1.756.457 3.472 1.325 4.984l-1.238 4.527 4.635-1.218A9.918 9.918 0 0 0 12 21.964c5.49 0 9.944-4.454 9.944-9.944 0-5.49-4.454-9.944-9.944-9.944" />
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

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="instagramGradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#feda75" />
          <stop offset="25%" stopColor="#fa7e1e" />
          <stop offset="50%" stopColor="#d62976" />
          <stop offset="75%" stopColor="#962fbf" />
          <stop offset="100%" stopColor="#4f5bd5" />
        </linearGradient>
      </defs>
      <path
        fill="url(#instagramGradient)"
        d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881"
      />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.525.02c1.8-.1 3.37.82 4.17 2.45.2.4.29.86.29 1.36v9.82c0 3.47-2.55 6.39-5.92 6.89-.42.06-.85.1-1.29.1-3.59 0-6.5-2.91-6.5-6.5s2.91-6.5 6.5-6.5c.24 0 .48.01.71.04V9.5c-.23-.03-.47-.05-.71-.05-2.48 0-4.5 2.02-4.5 4.5s2.02 4.5 4.5 4.5c.78 0 1.51-.2 2.15-.55.02-.28.03-.56.03-.85V6.81h4.13c-.07-1.1-.87-1.97-1.9-2.13-.2-.03-.41-.05-.62-.05-.66 0-1.29.18-1.84.5V.02c.65-.12 1.32-.04 1.95.2z" />
    </svg>
  );
}

export function LandingFooter({ brand }: { brand: string }) {
  const { lang } = useLang();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-8 border-t border-border bg-surface">
      <div className="mx-auto flex max-w-4xl flex-col items-center px-4 py-6 text-center">
        <img
          src={logoMark}
          alt={brand}
          loading="lazy"
          width={1040}
          height={375}
          className="h-16 w-auto object-contain sm:h-20"
        />

        <p className="mt-5 max-w-md text-[15px] font-medium leading-relaxed text-foreground">
          {lang === "bn"
            ? "কোনো কিছু জানতে/কাস্টমাইজ করতে সরাসরি যোগাযোগ করুন"
            : "Contact us directly to know more or customize"}
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          {SOCIAL_LINKS.map(({ key, href, label, icon: Icon, colorClass }) => (
            <a
              key={key}
              href={href}
              target={href.startsWith("http") ? "_blank" : undefined}
              rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
              aria-label={label}
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card shadow-sm transition-transform hover:scale-105",
                colorClass,
              )}
            >
              <Icon className="h-5 w-5" />
            </a>
          ))}
        </div>
      </div>

      <div className="border-t border-border">
        <p className="mx-auto max-w-6xl px-4 py-4 text-center text-xs text-muted-foreground">
          © {year} {brand}. {lang === "bn" ? "সর্বস্বত্ব সংরক্ষিত।" : "All rights reserved."}
        </p>
      </div>
    </footer>
  );
}
