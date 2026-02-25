import { Link } from "wouter";
import zowehLogoPath from "@assets/ChatGPT_Image_Feb_24,_2026,_10_13_39_PM_1771989231984.png";
import { useTranslation } from "react-i18next";

export function PublicFooter() {
  const { t } = useTranslation();

  return (
    <footer className="border-t bg-muted/30">
      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <div className="flex items-center mb-4">
              <img src={zowehLogoPath} alt="Zoweh Life" className="h-7 object-contain dark:invert dark:brightness-200 transition-[filter] duration-300" />
            </div>
            <p className="text-sm text-muted-foreground">
              {t('footer.tagline')}
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-3">{t('footer.quickLinks')}</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/salvation" className="text-muted-foreground hover:text-foreground transition-colors">
                  {t('footer.learnAboutSalvation')}
                </Link>
              </li>
              <li>
                <Link href="/journey" className="text-muted-foreground hover:text-foreground transition-colors">
                  {t('footer.newBelieverJourney')}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-muted-foreground hover:text-foreground transition-colors">
                  {t('footer.prayerRequest')}
                </Link>
              </li>
              <li>
                <Link href="/contact-us" className="text-muted-foreground hover:text-foreground transition-colors">
                  {t('footer.contactUs')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3">{t('footer.forMinistries')}</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/register-ministry" className="text-muted-foreground hover:text-foreground transition-colors" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                  {t('footer.registerMinistry')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Zoweh Life. {t('footer.allRightsReserved')}</p>
        </div>
      </div>
    </footer>
  );
}
