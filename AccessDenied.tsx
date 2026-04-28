import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, ArrowLeft, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default function AccessDenied() {
  return (
    <div className="container py-16">
      <Breadcrumbs />
      <div className="mx-auto max-w-xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="glass-strong relative overflow-hidden rounded-2xl p-10 text-center">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-danger/20 blur-3xl" />
          <div className="absolute -left-20 -bottom-20 h-56 w-56 rounded-full bg-secondary/20 blur-3xl" />
          <div className="relative">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-2xl bg-gradient-danger shadow-[0_0_40px_hsl(346_100%_62%/0.4)]">
              <Lock className="h-10 w-10 text-white" />
            </div>
            <h1 className="mt-6 font-display text-3xl font-bold">Access Restricted</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This area is reserved for FAIRSCAN AI <span className="font-semibold text-warning">administrators</span>.
              Your current account doesn't have the required role.
            </p>
            <div className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldAlert className="h-3.5 w-3.5 text-warning" />
              Action logged · Admin oversight active
            </div>
            <div className="mt-8 flex flex-col items-center justify-center gap-2 sm:flex-row">
              <Button asChild variant="outline"><Link to="/"><ArrowLeft className="mr-1 h-4 w-4" /> Back to home</Link></Button>
              <Button asChild className="bg-gradient-brand"><Link to="/account">Open Account</Link></Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
