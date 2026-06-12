import React from 'react';
import { Brain, Globe, Mail, MessageSquare, Share2, LifeBuoy, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="footer glass">
      <div className="footer-content">
        <div className="footer-brand">
          <div className="brand-logo">
            <div className="brand-icon" style={{ background: 'transparent', boxShadow: 'none', padding: 0 }}>
              <svg width="0" height="0" style={{ position: 'absolute' }}>
                <linearGradient id="footer-brain-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="30%" stopColor="#ec4899" />
                  <stop offset="70%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </svg>
              <Brain size={28} color="url(#footer-brain-gradient)" strokeWidth={2.5} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>SnarkEdit</h3>
          </div>
          <p>
            Professional image editing studio powered by artificial intelligence. 
            Create, edit, and export stunning visuals in seconds.
          </p>
        </div>

        <div className="footer-column">
          <h4>Product</h4>
          <ul>
            <li>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', cursor: 'default' }}>
                AI Models <span style={{ fontSize: '0.6rem', background: 'var(--primary)', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>COMING SOON</span>
              </span>
            </li>
            <li>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', cursor: 'default' }}>
                Magic Eraser <span style={{ fontSize: '0.6rem', background: 'var(--primary)', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>COMING SOON</span>
              </span>
            </li>
          </ul>
        </div>

        <div className="footer-column">
          <h4>Company</h4>
          <ul>
            <li><Link to="/info/about">About Us</Link></li>
            <li><Link to="/info/portfolio">Portfolio</Link></li>
            <li><Link to="/info/careers">Careers</Link></li>
            <li><Link to="/info/contact">Contact</Link></li>
          </ul>
        </div>

        <div className="footer-column">
          <h4>Legal</h4>
          <ul>
            <li><Link to="/info/privacy">Privacy Policy</Link></li>
            <li><Link to="/info/terms">Terms of Service</Link></li>
            <li><Link to="/info/cookie-policy">Cookie Policy</Link></li>
            <li><Link to="/info/ai-ethics">AI Ethics</Link></li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p className="copyright">
          © 2026 SnarkEdit Pro. All rights reserved.
        </p>
        
        <div className="social-links">
          <a href="#" className="social-link" title="Website"><Globe size={18} /></a>
          <a href="#" className="social-link" title="Community"><MessageSquare size={18} /></a>
          <a href="#" className="social-link" title="Connect"><Share2 size={18} /></a>
          <a href="#" className="social-link" title="Support"><LifeBuoy size={18} /></a>
          <a href="#" className="social-link" title="Contact"><Mail size={18} /></a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
