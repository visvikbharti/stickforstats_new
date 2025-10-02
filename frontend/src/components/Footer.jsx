import React from 'react';
import BrandedFooter from './common/BrandedFooter';

function Footer() {
  // Additional links specific to StickForStats
  const additionalLinks = [
    { title: 'Statistics Guide', href: '/guide/statistics' },
    { title: 'Research Papers', href: '/research' },
    { title: 'Community', href: '/community' },
  ];
  
  // Social links
  const socialLinks = {
    facebook: 'https://facebook.com/stickforstats',
    twitter: 'https://twitter.com/stickforstats',
    linkedin: 'https://linkedin.com/company/stickforstats',
    github: 'https://github.com/stickforstats',
  };
  
  return (
    <BrandedFooter 
      additionalLinks={additionalLinks}
      socialLinks={socialLinks}
      showSocialLinks={true}
      showContactInfo={true}
      showLinks={true}
    />
  );
}

export default Footer;