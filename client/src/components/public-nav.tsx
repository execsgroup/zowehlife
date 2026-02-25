import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useTheme } from "./theme-provider";
import { languages } from "@/lib/i18n";
import { Menu, X, Globe, Moon, Sun, Check } from "lucide-react";
import zowehLogoLight from "@assets/Screenshot_2026-02-24_at_10.38.33_PM_1771990719265.png";
import zowehLogoDark from "@assets/zoweh_life_logo_transparent_1771993303739.png";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

export function PublicNav() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();

  const navLinks = [
    { href: "/", label: t('nav.home'), key: "home" },
    { href: "/salvation", label: t('nav.salvation'), key: "salvation" },
    { href: "/journey", label: t('nav.journey'), key: "journey" },
    { href: "/contact-us", label: t('nav.contact'), key: "contact" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link href="/" className="flex items-center">
            <img src={zowehLogoLight} alt="Zoweh Life" className="h-12 w-[180px] object-contain dark:hidden" />
            <img src={zowehLogoDark} alt="Zoweh Life" className="h-12 w-[180px] object-contain hidden dark:block" />
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <Button
                  variant={location === link.href ? "secondary" : "ghost"}
                  className="text-sm"
                  data-testid={`nav-link-${link.key}`}
                >
                  {link.label}
                </Button>
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/member-portal/login">
              <Button variant="ghost" size="sm" data-testid="button-member-portal">
                {t('nav.memberPortal')}
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="sm" data-testid="button-login">
                {t('nav.ministryLogin')}
              </Button>
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" data-testid="button-settings-menu">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">{t('nav.settings')}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  {t('nav.language')}
                </DropdownMenuLabel>
                {languages.map((lang) => (
                  <DropdownMenuItem
                    key={lang.code}
                    onClick={() => i18n.changeLanguage(lang.code)}
                    data-testid={`button-lang-${lang.code}`}
                  >
                    <span className="mr-2 text-xs font-medium uppercase text-muted-foreground">{lang.code}</span>
                    {lang.label}
                    {i18n.language === lang.code && <Check className="h-4 w-4 ml-auto" />}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={toggleTheme} data-testid="menu-theme-toggle">
                  {theme === "light" ? (
                    <Moon className="h-4 w-4 mr-2" />
                  ) : (
                    <Sun className="h-4 w-4 mr-2" />
                  )}
                  {theme === "light" ? t('nav.darkMode') : t('nav.lightMode')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {mobileMenuOpen && (
          <nav className="md:hidden py-4 border-t">
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  <Button
                    variant={location === link.href ? "secondary" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setMobileMenuOpen(false)}
                    data-testid={`mobile-nav-link-${link.key}`}
                  >
                    {link.label}
                  </Button>
                </Link>
              ))}
              <div className="border-t pt-2 mt-2">
                <Link href="/member-portal/login">
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => setMobileMenuOpen(false)}
                    data-testid="mobile-button-member-portal"
                  >
                    {t('nav.memberPortal')}
                  </Button>
                </Link>
                <Link href="/login">
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => setMobileMenuOpen(false)}
                    data-testid="mobile-button-staff-login"
                  >
                    {t('nav.ministryLogin')}
                  </Button>
                </Link>
              </div>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
