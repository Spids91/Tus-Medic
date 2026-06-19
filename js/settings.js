// ─── SETTINGS.JS v1.0.0 ───────────────────────────────────────────────────────

function openSettings() {
  document.getElementById('settingsPanel').classList.add('open');
  // Sync dark toggle
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const toggle = document.getElementById('darkToggle');
  if (toggle) toggle.classList.toggle('on', isDark);
  haptic();
}

function closeSettings() {
  document.getElementById('settingsPanel').classList.remove('open');
  haptic();
}

// Close settings when tapping backdrop
document.getElementById('settingsPanel').addEventListener('click', function(e) {
  if (e.target === this) closeSettings();
});

// Override toggleDark to also update settings toggle
const _origToggleDark = toggleDark;
window.toggleDark = function() {
  _origToggleDark();
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const toggle = document.getElementById('darkToggle');
  if (toggle) toggle.classList.toggle('on', isDark);
};

// ── LEGAL DOCUMENTS ───────────────────────────────────────────────────────────
const LEGAL = {
  terms: {
    title: 'Terms of Service',
    body: `
      <h2>1. Acceptance of Terms</h2>
      <p>By accessing or using Tús Medic ("the app"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the app. Your continued use of the app constitutes acceptance of these terms.</p>

      <h2>2. Description of Service</h2>
      <p>Tús Medic is a free educational application designed to support the study and revision of prehospital pharmacology for PHECC-registered practitioners and students. The app provides drug reference information, quiz modes, medical terminology, hospital contact details and a paediatric drug calculator.</p>

      <h2>3. Medical Disclaimer</h2>
      <p>Tús Medic is a <strong>learning tool only</strong>. It is not a clinical decision support tool and must not be used to guide patient care decisions.</p>
      <p>Drug information contained in this app is based on the PHECC 2026 Clinical Practice Guidelines and has not been independently verified by PHECC or any regulatory body. Always refer to current official PHECC guidelines and your service's approved formulary when treating patients.</p>
      <p>The developer accepts no responsibility for any clinical decisions made on the basis of information contained in this app.</p>

      <h2>4. Limitation of Liability</h2>
      <p>The app is provided "as is" without warranty of any kind, express or implied. The developer does not warrant that the information contained in the app is accurate, complete or current. To the maximum extent permitted by law, the developer shall not be liable for any direct, indirect, incidental or consequential damages arising from your use of or reliance on the app.</p>

      <h2>5. Third Party Content</h2>
      <p>Drug information in this app is based on publicly available PHECC 2026 Clinical Practice Guidelines. Tús Medic is an independent educational tool and is not affiliated with, endorsed by, or approved by PHECC or any other regulatory body.</p>

      <h2>6. Age Requirement</h2>
      <p>This app is intended for users aged 16 and over. By using the app you confirm that you meet this age requirement.</p>

      <h2>7. Intellectual Property</h2>
      <p>The app design, code, quiz content, gamification system and all original content are the intellectual property of the developer and are protected by copyright under Irish law and the Berne Convention. © Keith O'Reilly 2026. All rights reserved.</p>
      <p>You may not reproduce, distribute or create derivative works from this app without explicit written permission from the developer.</p>

      <h2>8. Modifications</h2>
      <p>The developer reserves the right to modify, suspend or discontinue the app or these terms at any time without notice. Continued use of the app following any changes constitutes acceptance of the updated terms.</p>

      <h2>9. Monetisation</h2>
      <p>The app is currently provided free of charge. Future versions or platforms may be subject to a fee, which will be communicated clearly in advance.</p>

      <h2>10. Governing Law</h2>
      <p>These terms are governed by the laws of Ireland. Any disputes arising from your use of the app shall be subject to the exclusive jurisdiction of the Irish courts.</p>

      <p class="legal-meta">Last updated: June 2026 · © Keith O'Reilly 2026</p>
    `
  },
  privacy: {
    title: 'Privacy Policy',
    body: `
      <h2>Overview</h2>
      <p>Tús Medic is committed to protecting your privacy. This policy explains what data is stored, how it is stored, and your rights regarding that data.</p>

      <h2>Data Storage</h2>
      <p>All user data is stored <strong>locally on your device</strong> using browser localStorage. No data is transmitted to any server, third party, or external service of any kind.</p>

      <h2>What is Stored</h2>
      <p>The following data is stored locally on your device only:</p>
      <p>• Quiz progress, XP and streak counts<br>• Drug mastery levels and question history<br>• Personal notes added to drug pages<br>• App preferences (dark mode, etc.)<br>• Daily activity log for the progress chart</p>

      <h2>Cookies and Tracking</h2>
      <p>This app does not use cookies, analytics, tracking pixels, or any technology that monitors your behaviour or transmits data externally.</p>

      <h2>Third Party Services</h2>
      <p>The app loads the Inter font from Google Fonts. This is the only external resource loaded and is subject to Google's privacy policy. No personal data is shared with Google as part of this request.</p>

      <h2>Deleting Your Data</h2>
      <p>You can delete all locally stored data at any time by tapping <strong>Delete All Progress</strong> in Settings, or by clearing your browser or Safari data in your device settings.</p>

      <h2>GDPR</h2>
      <p>As all data is stored locally on your device and no personal data is collected or processed by the developer, the General Data Protection Regulation (GDPR) data processing obligations do not apply to this app in its current form.</p>

      <h2>Changes to This Policy</h2>
      <p>If the privacy practices of this app change materially, this policy will be updated and the app version number incremented.</p>

      <h2>Contact</h2>
      <p>For privacy queries, contact the developer via the GitHub repository.</p>

      <p class="legal-meta">Last updated: June 2026 · © Keith O'Reilly 2026</p>
    `
  },
  disclaimer: {
    title: 'Medical Disclaimer',
    body: `
      <h2>Important Notice</h2>
      <p><strong>Tús Medic is a learning tool only.</strong></p>
      <p>This app is designed to support study and revision of prehospital pharmacology for PHECC-registered practitioners and students. It is not a clinical reference tool and must not be used to guide patient care decisions.</p>
      <p>Drug information presented here is based on the PHECC 2026 Clinical Practice Guidelines and has not been independently verified by PHECC or any regulatory body.</p>
      <p><strong>Always refer to current official PHECC guidelines and your service's approved formulary when treating patients.</strong></p>
      <p>The developer accepts no responsibility for clinical decisions made on the basis of information contained in this app.</p>
      <p>Tús Medic is an independent educational tool and is not affiliated with, endorsed by, or approved by PHECC.</p>
      <p class="legal-meta">© Keith O'Reilly 2026</p>
    `
  },
  patches: {
    title: 'Patch Notes',
    body: `
      <h2>v1.0.0 — June 2026</h2>
      <p>Settings panel with dark mode, legal documents and version info. Complete quiz engine rewrite — daily challenge, standard, adaptive, weak spots, timed, category and spaced repetition all rebuilt cleanly. Terms of Service and Privacy Policy added. Settings cog replaces dark mode toggle in header.</p>

      <h2>v0.9.1 — June 2026</h2>
      <p>Floating pill tab bar. iOS swipe animation on drug detail. Chart y-axis with scaling. Chart tab colours match bars. Standard and Adaptive as separate quiz modes. Real date on daily challenge. Rookie level card colour fixed. Category back button sticky. Privacy policy added.</p>

      <h2>v0.9.0 — June 2026</h2>
      <p>Universal design system — Inter font, cobalt blue primary, deep green success, spacing tokens, type scale, animation tokens. Full colour and spacing audit.</p>

      <h2>v0.8.0 — June 2026</h2>
      <p>Complete quiz overhaul — daily challenge, 6 quiz modes, spaced repetition, timed mode with countdown ring, category quiz, consecutive streak burst, wrong answer breakdown.</p>

      <h2>v0.7.0 — June 2026</h2>
      <p>Swipe right to close drug detail. Medical terms accordion fix. Card colours. Navy progress bar. XP rebalanced to 3 per correct answer. Paed calculator drugs tappable. © Keith O'Reilly 2026 added.</p>

      <h2>v0.6.0 — June 2026</h2>
      <p>Badges and achievements (12 total). Streak freeze token system. Activity bar chart with 4 metric toggles. Estimated study time. Warmer light mode. Drug of the Day fix.</p>

      <h2>v0.5.0 — June 2026</h2>
      <p>Home dashboard with Drug of the Day, level card, quick stats. Disclaimer modal on first launch. Adaptive quiz difficulty. Medical terms grouped by category. Paed calculator scope buttons. Tús Medic rebrand.</p>

      <h2>v0.4.0 — June 2026</h2>
      <p>Full codebase refactor into 13 separate files.</p>

      <h2>v0.3.0 — June 2026</h2>
      <p>Learn tab with PCR codes, Primary PCI Line, medical terminology and paediatric weight calculator. Global search. Tap to call.</p>

      <h2>v0.2.0 — June 2026</h2>
      <p>Dark mode, slate and emerald theme, 5-tier mastery system, notes on drug pages, haptic feedback, XP levels.</p>

      <h2>v0.1.0 — June 2026</h2>
      <p>Initial release. All 46 PHECC 2026 formulary drugs, reference mode with search and scope filters, flashcard and multiple choice quiz, XP and streak tracking.</p>

      <p class="legal-meta">© Keith O'Reilly 2026</p>
    `
  }
};

function openLegal(key) {
  const doc = LEGAL[key];
  if (!doc) return;
  document.getElementById('legalTitle').textContent = doc.title;
  document.getElementById('legalBody').innerHTML = doc.body;
  document.getElementById('legalModal').classList.add('open');
  haptic();
}

function closeLegal() {
  document.getElementById('legalModal').classList.remove('open');
  haptic();
}
