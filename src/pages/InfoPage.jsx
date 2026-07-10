import React from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { PAGE_CONTENT } from '../constants/searchContent';

const InfoPage = ({ theme, toggleTheme }) => {
  const { pageId } = useParams();
  const pageData = PAGE_CONTENT[pageId] || { title: 'Page Not Found', content: 'The page you are looking for does not exist.' };

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-main)' }}>
      {/* We pass empty functions/null for Navbar props since this is just an info page */}
      <Navbar 
        onHome={() => {}} 
        theme={theme} 
        toggleTheme={toggleTheme} 
        hideEditorControls={true}
      />
      
      <main className="main-content" style={{ flex: 1, padding: '4rem 2rem', display: 'flex', justifyContent: 'center' }}>
        <div style={{ maxWidth: '800px', width: '100%', padding: '3rem 0' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '1.5rem', color: 'var(--text-main)' }}>
            {pageData.title}
          </h1>
          <div style={{ height: '4px', width: '60px', background: 'var(--primary)', marginBottom: '3rem', borderRadius: '2px' }}></div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {pageData.content.map((paragraph, idx) => (
              <p key={idx} style={{ fontSize: '1.15rem', color: 'var(--text-muted)', lineHeight: 1.8, textAlign: 'justify' }}>
                {paragraph}
              </p>
            ))}
          </div>
          
          <div style={{ marginTop: '4rem' }}>
            <Link to="/" style={{ display: 'inline-block', padding: '0.8rem 1.5rem', background: 'var(--primary)', color: 'white', borderRadius: '12px', textDecoration: 'none', fontWeight: 700 }}>
              Return to Editor
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default InfoPage;
