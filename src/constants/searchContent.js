import {
  Briefcase,
  Cookie,
  FileText,
  Files,
  Image as ImageIcon,
  Info,
  Mail,
  Palette,
  Scale,
  Shield,
  Sparkles,
} from 'lucide-react';
import { TOOLS_DEFS } from './tools';

export const PAGE_CONTENT = {
  'ai-models': { title: 'AI Models', icon: Sparkles, content: ['Coming Soon... Our powerful artificial intelligence models are currently in development.'] },
  'magic-eraser': { title: 'Magic Eraser', icon: Palette, content: ['Coming Soon... Instantly remove backgrounds and unwanted objects from your photos with AI.'] },
  'about': {
    title: 'About Us',
    icon: Info,
    content: [
      'Welcome to DocEdit, your premier destination for professional, AI-powered image editing. Founded with the vision of democratizing advanced design tools, we have built a platform that bridges the gap between complex software and intuitive user experience. Our dedicated team of engineers, designers, and AI researchers work tirelessly to bring state-of-the-art capabilities directly to your browser.',
      'Our journey began when we realized that traditional image editing software was either too intimidating for beginners or too limited for professionals. DocEdit was conceived as the perfect middle ground - a robust, feature-rich studio that learns and adapts to your creative workflow. Whether you are retouching portraits, designing marketing materials, or creating complex collages, our platform is designed to make your creative process as seamless and enjoyable as possible.',
      'We believe that creativity should have no boundaries. That is why we are constantly innovating, integrating the latest advancements in artificial intelligence and machine learning to automate tedious tasks. This gives you more time to focus on what truly matters: your artistic vision. Thank you for being a part of our growing community, and we cannot wait to see what you create next.'
    ]
  },
  'portfolio': {
    title: 'Portfolio',
    icon: ImageIcon,
    content: [
      'Welcome to the DocEdit Portfolio, a curated gallery showcasing the incredible talent of our global community. From stunning digital artwork and professional photography retouching to eye-catching social media graphics, this space celebrates the diverse ways our users leverage our platform to bring their ideas to life.',
      'Every image here tells a story of creativity unleashed. By providing powerful tools like advanced layering, precise color correction, and AI-driven enhancements, DocEdit empowers users of all skill levels to produce agency-quality results. We frequently feature standout creations from our community, highlighting the innovative techniques and unique perspectives of our users.',
      'Are you proud of a recent project you created using DocEdit? We are always on the lookout for fresh, inspiring work to feature in our portfolio. Share your creations with us on social media using our official hashtags, and you might just see your masterpiece displayed here, inspiring thousands of other creators worldwide.'
    ]
  },
  'careers': {
    title: 'Careers',
    icon: Briefcase,
    content: [
      'Join the team that is revolutionizing the digital design landscape. At DocEdit, we are always looking for passionate, forward-thinking individuals who want to make a real impact in the world of creative technology. We foster a culture of innovation, collaboration, and continuous learning, where every team member is encouraged to push boundaries and explore new ideas.',
      'We offer a dynamic, inclusive work environment with competitive compensation packages, comprehensive health benefits, and flexible remote work options. Whether you are an expert in computer vision, a talented frontend developer, or a creative UX/UI designer, there is a place for you here. We value diversity of thought and experience, knowing that our best ideas come from a team with varied backgrounds and perspectives.',
      'If you are ready to challenge the status quo and help build tools that empower millions of creators globally, we want to hear from you. Explore our current open positions below or send us an open application outlining how your unique skills can contribute to our mission. Let us build the future of image editing together.'
    ]
  },
  'contact': {
    title: 'Contact Us',
    icon: Mail,
    content: [
      'We are here to help! Whether you have a question about a specific feature, need technical support, or simply want to share your feedback, the DocEdit team is always ready to assist you. Our dedicated support staff operates around the clock to ensure that your creative workflow remains uninterrupted and your experience is nothing short of excellent.',
      'For general inquiries and technical assistance, please reach out to us via email at support@docedit.com. We aim to respond to all queries within 24 hours. If you are a business or enterprise looking for custom solutions, API access, or partnership opportunities, please contact our business development team at partnerships@docedit.com.',
      'Additionally, we encourage you to join our active community forums and social media channels. There, you can connect with other creators, share tips and tricks, and get real-time advice from both our team and experienced users. Your input drives our innovation, so never hesitate to get in touch.'
    ]
  },
  'privacy': {
    title: 'Privacy Policy',
    icon: Shield,
    content: [
      'At DocEdit, your privacy is of paramount importance to us. This Privacy Policy outlines the types of personal information we collect, how it is used, and the steps we take to ensure your data remains secure. We are committed to maintaining the highest standards of data protection and complying with all applicable global privacy regulations, including GDPR and CCPA.',
      'When you use our platform, we collect essential information required to provide our services, such as account details and usage metrics. Importantly, the images you upload and edit on DocEdit remain entirely your property. We employ industry-standard encryption protocols during data transmission and storage to protect your creative assets and personal information from unauthorized access.',
      'We do not sell your personal data to third parties. Any data shared with trusted service providers is strictly for the purpose of improving platform functionality and user experience. By continuing to use DocEdit, you consent to the practices described in this policy. We encourage you to review this document periodically, as we may update it to reflect new features or legal requirements.'
    ]
  },
  'terms': {
    title: 'Terms of Service',
    icon: Scale,
    content: [
      'Welcome to DocEdit. By accessing or using our platform, you agree to be bound by these Terms of Service. These terms govern your access to and use of our website, applications, and all associated services. We urge you to read these terms carefully before creating an account or using our editing tools, as they establish a legally binding agreement between you and DocEdit.',
      'As a user, you are granted a non-exclusive, revocable license to utilize our platform for personal and commercial purposes, subject to compliance with our acceptable use policies. You are solely responsible for the content you create and upload. DocEdit prohibits the use of our tools for generating illegal, harmful, or copyright-infringing material. We reserve the right to suspend or terminate accounts that violate these guidelines.',
      'While we strive to provide uninterrupted and high-quality service, DocEdit is provided on an "as is" and "as available" basis. We are not liable for any data loss, service interruptions, or damages arising from your use of the platform. We reserve the right to modify or discontinue any feature at our discretion. Continued use of the service following any changes to these terms constitutes your acceptance of those changes.'
    ]
  },
  'cookie-policy': {
    title: 'Cookie Policy',
    icon: Cookie,
    content: [
      'This Cookie Policy explains how DocEdit uses cookies and similar tracking technologies to enhance your browsing experience. Cookies are small data files stored on your device that help us remember your preferences, understand how you interact with our platform, and deliver more relevant content. By using our website, you consent to our use of cookies in accordance with this policy.',
      'We utilize both session cookies, which expire when you close your browser, and persistent cookies, which remain on your device until deleted. Essential cookies are necessary for basic platform functionality, such as user authentication and security. Analytics cookies help us gather anonymous data on website traffic and user behavior, enabling us to continuously optimize our performance and design.',
      'You have full control over your cookie preferences. Most web browsers allow you to manage or disable cookies through their settings menu. However, please note that blocking essential cookies may impact your ability to use certain features of DocEdit effectively. For more detailed information on the specific third-party cookies we use and how to manage them, please review our comprehensive settings guide.'
    ]
  },
  'ai-ethics': {
    title: 'AI Ethics',
    icon: Sparkles,
    content: [
      'At DocEdit, we are deeply committed to the responsible and ethical development of Artificial Intelligence. As AI increasingly shapes the digital creation landscape, we recognize our profound responsibility to deploy these technologies in ways that empower users while minimizing potential harm. Our AI Ethics policy serves as a guiding framework for all our research, development, and product decisions.',
      'We prioritize transparency, fairness, and human-centric design. Our AI models are rigorously tested to identify and mitigate biases, ensuring that our tools are inclusive and perform equitably across diverse datasets. We firmly believe that AI should augment human creativity, not replace it. Therefore, we design our automated features to act as collaborative assistants, always keeping the final creative control firmly in the hands of the artist.',
      'Furthermore, we actively engage in the ongoing global dialogue surrounding AI safety and copyright. We are committed to respecting intellectual property rights and are continually developing safeguards to prevent the misuse of our generative tools. As the technological landscape evolves, so too will our ethical guidelines, ensuring that DocEdit remains a trusted, secure, and innovative platform for creators everywhere.'
    ]
  },
};

export const APP_TOOL_LINKS = [
  {
    title: 'Reduce KB',
    description: 'Compress images, resize dimensions, set DPI, and export JPG, PNG, or WebP files.',
    path: '/reduce-image-size',
    icon: ImageIcon,
    keywords: ['compress', 'resize', 'dpi', 'kb', 'image reducer', 'reduce image size'],
  },
  {
    title: 'Enhance',
    description: 'Improve brightness, contrast, saturation, warmth, sharpness, and image quality.',
    path: '/enhance-image',
    icon: Sparkles,
    keywords: ['enhance image', 'sharpen', 'polish', 'quality', 'brightness', 'contrast'],
  },
  {
    title: 'Create PDF',
    description: 'Turn one or more images into a PDF with page size, orientation, margin, and quality controls.',
    path: '/create-pdf-from-image',
    icon: FileText,
    keywords: ['image to pdf', 'pdf from image', 'jpg to pdf', 'png to pdf'],
  },
  {
    title: 'Merge Docs',
    description: 'Combine PDFs, images, text files, and attachments into one downloadable document.',
    path: '/merge-documents',
    icon: Files,
    keywords: ['merge documents', 'combine pdf', 'join files', 'documents'],
  },
];

const pageItems = Object.entries(PAGE_CONTENT).map(([id, page]) => ({
  id: `info-${id}`,
  type: 'page',
  title: page.title,
  description: page.content[0],
  path: `/info/${id}`,
  icon: page.icon || Info,
  keywords: page.content,
}));

const editorToolItems = TOOLS_DEFS.map((tool) => ({
  id: `editor-${tool.id}`,
  type: 'editor-tool',
  title: tool.label,
  description: `${tool.category} editor tool`,
  path: '/',
  icon: tool.icon,
  category: tool.category,
  toolId: tool.id,
  keywords: [tool.id, tool.category],
}));

export const SEARCH_ITEMS = [
  ...APP_TOOL_LINKS.map((tool) => ({ ...tool, id: `app-${tool.path}`, type: 'tool' })),
  ...editorToolItems,
  ...pageItems,
];
