/** English — base translation (all keys defined here) */
const en = {
  // ── Common ──
  common_back: 'Back',
  common_save: 'Save',
  common_cancel: 'Cancel',
  common_delete: 'Delete',
  common_edit: 'Edit',
  common_done: 'Done',
  common_loading: 'Loading...',
  common_error: 'Error',
  common_success: 'Success',
  common_retry: 'Retry',
  common_search: 'Search',
  common_noResults: 'No results',
  common_ok: 'OK',

  // ── Sign In ──
  signIn_title: 'ReviewReach',
  signIn_subtitle: 'Get more Google reviews for your business',
  signIn_google: 'Sign in with Google',
  signIn_skip: 'Skip (Dev Mode)',

  // ── Dashboard ──
  dash_title: 'My Branches',
  dash_addBranch: 'Add Branch',
  dash_noBranches: 'No branches yet',
  dash_noBranchesSub: 'Add your first business location to start collecting reviews.',
  dash_totalScans: 'Total Scans',
  dash_totalVisits: 'Total Visits',
  dash_totalCopied: 'Reviews Copied',

  // ── Branch Detail ──
  branch_details: 'Branch Details',
  branch_name: 'Branch Name',
  branch_business: 'Business',
  branch_address: 'Address',
  branch_placeId: 'Place ID',
  branch_aiTone: 'AI Tone',
  branch_keywords: 'Keywords',
  branch_addedOn: 'Added On',
  branch_delete: 'Delete Branch',
  branch_deleteConfirm: 'Are you sure you want to delete this branch? This action cannot be undone.',
  branch_notFound: 'Branch not found',
  branch_notFoundSub: 'This branch may have been deleted.',
  branch_scans: 'Scans',
  branch_visits: 'Visits',
  branch_copied: 'Copied',
  branch_cvr: 'CVR',
  branch_whatsapp: 'WhatsApp\nFollow-Up',
  branch_feedback: 'Feedback\nInbox',
  branch_reviews: 'Google\nReviews',
  branch_saveChanges: 'Save Changes',
  branch_saving: 'Saving...',

  // ── Quick Actions ──
  quick_whatsappMsg: 'Hi! Thank you for visiting {{business}}. We\'d love your feedback \u2014 it only takes 30 seconds:',

  // ── Feedback Inbox ──
  feedback_title: 'Feedback Inbox',
  feedback_empty: 'No feedback yet',
  feedback_emptySub: 'Private feedback from customers will appear here.',
  feedback_call: 'Call',
  feedback_email: 'Email',

  // ── Settings ──
  settings_title: 'Settings',
  settings_legal: 'LEGAL',
  settings_privacy: 'Privacy Policy',
  settings_privacySub: 'How we handle your data',
  settings_terms: 'Terms of Service',
  settings_termsSub: 'Usage agreement',
  settings_support: 'SUPPORT',
  settings_faq: 'FAQ',
  settings_faqSub: 'Frequently asked questions',
  settings_contact: 'Contact Us',
  settings_contactSub: 'Get help or share feedback',
  settings_app: 'APP',
  settings_rateUs: 'Rate Us',
  settings_rateUsSub: 'Love ReviewReach? Leave a review!',
  settings_share: 'Share App',
  settings_shareSub: 'Tell a fellow business owner',
  settings_shareMsg: 'Check out ReviewReach \u2014 the easiest way to get more Google reviews for your business!',
  settings_about: 'About',
  settings_aboutSub: 'Version & credits',
  settings_account: 'ACCOUNT',
  settings_signOut: 'Sign Out',
  settings_deleteAccount: 'Delete Account',
  settings_deleteAccountSub: 'Permanently remove all data',
  settings_language: 'Language',
  settings_languageSub: 'Change app language',
  settings_preferences: 'PREFERENCES',

  // ── Language Picker ──
  language_title: 'Language',
  language_searchPlaceholder: 'Search languages...',
  language_indian: 'Indian Languages',
  language_global: 'Global Languages',

  // ── Delete Account ──
  deleteAccount_title: 'Delete Account',
  deleteAccount_warning: 'This action is permanent and cannot be undone.',
  deleteAccount_confirm: 'Are you sure you want to delete your account and all associated data?',
  deleteAccount_button: 'Delete My Account',

  // ── About ──
  about_title: 'About',
  about_version: 'Version',
  about_rateUs: 'Rate Us',
  about_shareApp: 'Share with a Friend',

  // ── Add Branch Modal ──
  addBranch_title: 'Add Branch',
  addBranch_nameLabel: 'Branch Name',
  addBranch_namePlaceholder: 'e.g. Downtown Location',
  addBranch_mapsLabel: 'Google Maps URL',
  addBranch_mapsPlaceholder: 'Paste your Google Maps link',
  addBranch_keywordsLabel: 'Keywords',
  addBranch_keywordsPlaceholder: 'e.g. coffee, cozy, quick service',
  addBranch_toneLabel: 'AI Tone',
  addBranch_submit: 'Add Branch',
  addBranch_selectFromMap: 'Select from Map',
};

export type TranslationKeys = keyof typeof en;
export default en;
