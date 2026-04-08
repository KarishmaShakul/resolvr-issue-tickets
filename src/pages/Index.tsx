import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Shield, BarChart3, Users, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import resolvrLogo from "@/assets/resolvr-logo.png";

const features = [
  { icon: Zap, title: "AI-Powered Triage", desc: "Auto-categorize and prioritize tickets with intelligent detection." },
  { icon: Shield, title: "Role-Based Access", desc: "Secure admin and user dashboards with granular permissions." },
  { icon: BarChart3, title: "Real-Time Analytics", desc: "Track resolution times, trends, and team performance live." },
  { icon: Users, title: "Team Collaboration", desc: "Assign, comment, and resolve issues together seamlessly." },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

export default function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Nav */}
      <header className="w-full border-b border-border/60 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={resolvrLogo} alt="Resolvr" width={36} height={36} className="rounded-lg" style={{ imageRendering: "crisp-edges" }} />
            <span className="text-xl font-bold font-[Poppins] tracking-tight text-foreground">Resolvr</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild><Link to="/login">Log in</Link></Button>
            <Button asChild><Link to="/login?tab=signup">Get Started <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex items-center justify-center px-6 py-20 md:py-28">
        <div className="max-w-3xl text-center space-y-8">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              <Zap className="h-3.5 w-3.5" /> AI-Powered Issue Resolution
            </span>
          </motion.div>

          <motion.h1
            className="text-4xl sm:text-5xl md:text-6xl font-extrabold font-[Poppins] leading-tight tracking-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6 }}
          >
            Resolve Issues{" "}
            <span className="text-primary">Faster</span>
            <br className="hidden sm:block" /> with Intelligent Ticketing
          </motion.h1>

          <motion.p
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            Resolvr streamlines your organization's support workflow with AI-driven categorization, smart priority detection, and real-time collaboration.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.5 }}
          >
            <Button size="lg" asChild className="text-base px-8 h-12 rounded-xl shadow-lg shadow-primary/25">
              <Link to="/login?tab=signup">Start for Free <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-base px-8 h-12 rounded-xl">
              <Link to="/login">Sign In</Link>
            </Button>
          </motion.div>

          <motion.div
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground pt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            {["No credit card required", "Free for small teams", "Setup in minutes"].map((t) => (
              <span key={t} className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-accent" />{t}</span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border/60 bg-muted/30 px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold font-[Poppins] text-center mb-12">
            Everything you need to manage issues
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-40px" }}
                variants={fadeUp}
                className="rounded-2xl border border-border bg-card p-6 space-y-3 hover:shadow-md transition-shadow"
              >
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-base">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h2 className="text-2xl md:text-3xl font-bold font-[Poppins]">Ready to streamline your support?</h2>
          <p className="text-muted-foreground text-lg">Join organizations that resolve issues faster with Resolvr.</p>
          <Button size="lg" asChild className="text-base px-10 h-12 rounded-xl shadow-lg shadow-primary/25">
            <Link to="/login?tab=signup">Get Started — It's Free <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <img src={resolvrLogo} alt="Resolvr" width={24} height={24} className="rounded" style={{ imageRendering: "crisp-edges" }} />
            <span className="font-semibold text-foreground">Resolvr</span>
          </div>
          <p>© {new Date().getFullYear()} Resolvr. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
