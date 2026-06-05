'use client';
import { useTranslation } from '@/context/TranslationContext';

export default function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="footer">
      <div className="footer-brand">TRIVENT</div>
      <p>{t('common.footer_desc')}</p>
      <p style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>© 2026 TRIVENT by Hào · Sang · Đức. All rights reserved.</p>
    </footer>
  );
}
