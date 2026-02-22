import { Mail, MessageCircle, Calendar } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 px-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Get in <span className="gradient-text">Touch</span>
          </h1>
          <p className="text-gray-400 text-lg">
            Ready to explore working together? Reach out directly — we respond within 24 hours.
          </p>
        </div>

        {/* Contact methods */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-14">
          {[
            {
              icon: <Calendar className="text-gold" size={22} />,
              title: "Schedule a Call",
              desc: "Book a free 30-minute intro call at a time that works for you.",
              action: "Book on Calendly",
              href: "https://calendly.com/shehzadahmed-arcusquantfund",
            },
            {
              icon: <Mail className="text-gold" size={22} />,
              title: "Email Us",
              desc: "Send your questions or investment inquiry directly.",
              action: "contact@arcusquantfund.com",
              href: "mailto:contact@arcusquantfund.com",
            },
            {
              icon: <MessageCircle className="text-gold" size={22} />,
              title: "WhatsApp",
              desc: "Quick questions? Chat with us on WhatsApp.",
              action: "Message on WhatsApp",
              href: "https://wa.me/message/arcusquantfund",
            },
          ].map((c) => (
            <div key={c.title} className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gold/30 transition-colors">
              <div className="mb-4">{c.icon}</div>
              <h3 className="text-white font-semibold mb-2">{c.title}</h3>
              <p className="text-gray-400 text-sm mb-4 leading-relaxed">{c.desc}</p>
              <a
                href={c.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold hover:text-gold-light text-sm font-medium transition-colors"
              >
                {c.action} →
              </a>
            </div>
          ))}
        </div>

        {/* Contact form */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 mb-16">
          <h2 className="text-xl font-bold text-white mb-6">Send a Message</h2>
          <form className="flex flex-col gap-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Name</label>
                <input
                  type="text"
                  placeholder="Your full name"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-gold transition-colors"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Email</label>
                <input
                  type="email"
                  placeholder="your@email.com"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-gold transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2">Account Size (approx.)</label>
              <select className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-300 focus:outline-none focus:border-gold transition-colors">
                <option value="">Select range</option>
                <option value="10k-25k">$10,000 – $25,000</option>
                <option value="25k-50k">$25,000 – $50,000</option>
                <option value="50k-100k">$50,000 – $100,000</option>
                <option value="100k+">$100,000+</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2">Message</label>
              <textarea
                rows={4}
                placeholder="Tell us about your goals and any questions you have..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-gold transition-colors resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gold hover:bg-gold-dark text-white font-semibold rounded-xl transition-colors"
            >
              Send Message
            </button>

            <p className="text-gray-600 text-xs text-center">
              We respond to all inquiries within 24 hours. Your information is kept strictly confidential.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
