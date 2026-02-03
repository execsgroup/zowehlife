import { Link } from "wouter";
import { Heart } from "lucide-react";

export function PublicFooter() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
                <Heart className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">Zoweh Life</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Nurturing faith and building community, one soul at a time.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/salvation" className="text-muted-foreground hover:text-foreground transition-colors">
                  Learn About Salvation
                </Link>
              </li>
              <li>
                <Link href="/journey" className="text-muted-foreground hover:text-foreground transition-colors">
                  New Believer Journey
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-muted-foreground hover:text-foreground transition-colors">
                  Prayer Request
                </Link>
              </li>
              <li>
                <Link href="/contact-us" className="text-muted-foreground hover:text-foreground transition-colors">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3">For Ministries</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/login" className="text-muted-foreground hover:text-foreground transition-colors">
                  Leader Login
                </Link>
              </li>
              <li>
                <Link href="/?registerMinistry=true" className="text-muted-foreground hover:text-foreground transition-colors">
                  Register a Ministry
                </Link>
              </li>
              <li>
                <Link href="/setup" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-admin-setup">
                  Admin Setup
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Zoweh Life. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
