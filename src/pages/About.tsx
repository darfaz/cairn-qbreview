import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Footer from "@/components/Footer";

const About = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="container mx-auto px-4 py-8 flex-1">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Our Team</h1>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-xl text-muted-foreground mb-6">
              Combining Wall Street expertise with Silicon Valley innovation
            </p>
            
            <p className="text-foreground leading-relaxed">
              BeScored brings together elite professionals from finance, technology, software development, 
              and accounting. Our team includes seasoned CPAs, valuation experts, and experienced software 
              developers, who have worked for Deloitte, EY, and KPMG, Fortune 500 companies, leading 
              investment banks, and innovative startups.
            </p>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default About;
