import React from 'react';
import { Smile, Globe, Mail, MessageSquare, Share2, LifeBuoy, Zap } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="footer glass">
      <div className="footer-content">
        <div className="footer-brand">
          <div className="brand-logo">
            <div className="brand-icon">
              <Smile color="white" size={20} />
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
            <li><a href="#">Editor</a></li>
            <li><a href="#">Templates</a></li>
            <li><a href="#">AI Models</a></li>
            <li><a href="#">Magic Eraser</a></li>
          </ul>
        </div>

        <div className="footer-column">
          <h4>Company</h4>
          <ul>
            <li><a href="#">About Us</a></li>
            <li><a href="#">Portfolio</a></li>
            <li><a href="#">Careers</a></li>
            <li><a href="#">Contact</a></li>
          </ul>
        </div>

        <div className="footer-column">
          <h4>Legal</h4>
          <ul>
            <li><a href="#">Privacy Policy</a></li>
            <li><a href="#">Terms of Service</a></li>
            <li><a href="#">Cookie Policy</a></li>
            <li><a href="#">AI Ethics</a></li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p className="copyright">
          © 2026 SnarkEdit Pro. All rights reserved. Made with ❤️ by Antigravity AI.
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
