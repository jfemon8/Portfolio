import mongoose, { type Model } from 'mongoose';
import type { ISiteContent } from '../types/index.js';

/**
 * Admin-managed site copy / UI text (singleton, like SeoSettings/SiteSettings).
 * Every public string also has a hardcoded fallback in its component, so an
 * empty/missing doc renders the site identically (zero-risk dynamic copy).
 * Grows per P12 increment. Mongoose ESM-safe pattern (do NOT regress to
 * named runtime imports).
 */
const heroSchema = new mongoose.Schema(
  {
    availableBadge: { type: String, default: '' },
    unavailableBadge: { type: String, default: '' },
    greeting: { type: String, default: '' },
    ctaProjects: { type: String, default: '' },
    ctaResume: { type: String, default: '' },
    ctaContact: { type: String, default: '' },
    scrollLabel: { type: String, default: '' },
    terminalTitle: { type: String, default: '' },
    whoamiCmd: { type: String, default: '' },
    stackCmd: { type: String, default: '' },
    stack: { type: [{ label: String, value: String }], default: [] },
    goalsCmd: { type: String, default: '' },
    goalsText: { type: String, default: '' },
  },
  { _id: false }
);

const aboutSchema = new mongoose.Schema(
  {
    strengthsHeading: { type: String, default: '' },
    strengths: { type: [String], default: [] },
  },
  { _id: false }
);

const footerSchema = new mongoose.Schema(
  {
    wordmark: { type: String, default: '' },
    linkProjects: { type: String, default: '' },
    linkBlog: { type: String, default: '' },
    linkAdmin: { type: String, default: '' },
    builtPrefix: { type: String, default: '' },
    builtSuffix: { type: String, default: '' },
  },
  { _id: false }
);

const navSchema = new mongoose.Schema(
  {
    items: { type: [{ key: String, label: String }], default: [] },
  },
  { _id: false }
);

const statesSchema = new mongoose.Schema(
  {
    loading: { type: String, default: '' },
    error: { type: String, default: '' },
    retry: { type: String, default: '' },
    empty: { type: String, default: '' },
    notFoundError: { type: String, default: '' },
    notFoundHome: { type: String, default: '' },
    homeLoading: { type: String, default: '' },
    homeError: { type: String, default: '' },
    projectsEmpty: { type: String, default: '' },
    projectsFilterEmpty: { type: String, default: '' },
    postsEmpty: { type: String, default: '' },
    projectNotFound: { type: String, default: '' },
    postNotFound: { type: String, default: '' },
  },
  { _id: false }
);

const authSchema = new mongoose.Schema(
  {
    panelTitle: { type: String, default: '' },
    panelSubtitle: { type: String, default: '' },
    emailLabel: { type: String, default: '' },
    emailPlaceholder: { type: String, default: '' },
    emailRequired: { type: String, default: '' },
    passwordLabel: { type: String, default: '' },
    passwordPlaceholder: { type: String, default: '' },
    passwordRequired: { type: String, default: '' },
    signIn: { type: String, default: '' },
    signingIn: { type: String, default: '' },
    footer: { type: String, default: '' },
    welcomeToast: { type: String, default: '' },
    failToast: { type: String, default: '' },
  },
  { _id: false }
);

const formsSchema = new mongoose.Schema(
  {
    nameLabel: { type: String, default: '' },
    namePlaceholder: { type: String, default: '' },
    nameRequired: { type: String, default: '' },
    emailLabel: { type: String, default: '' },
    emailPlaceholder: { type: String, default: '' },
    emailRequired: { type: String, default: '' },
    emailInvalid: { type: String, default: '' },
    subjectLabel: { type: String, default: '' },
    subjectPlaceholder: { type: String, default: '' },
    messageLabel: { type: String, default: '' },
    messagePlaceholder: { type: String, default: '' },
    messageRequired: { type: String, default: '' },
    messageMin: { type: String, default: '' },
    send: { type: String, default: '' },
    sending: { type: String, default: '' },
    sentTitle: { type: String, default: '' },
    sentBody: { type: String, default: '' },
    sendAnother: { type: String, default: '' },
    sentToast: { type: String, default: '' },
    failToast: { type: String, default: '' },
    infoEmail: { type: String, default: '' },
    infoPhone: { type: String, default: '' },
    infoLocation: { type: String, default: '' },
  },
  { _id: false }
);

const labelsSchema = new mongoose.Schema(
  {
    researchStages: { type: [String], default: [] },
    caseProblem: { type: String, default: '' },
    caseProcess: { type: String, default: '' },
    caseArchitecture: { type: String, default: '' },
    caseDatabase: { type: String, default: '' },
    caseApi: { type: String, default: '' },
    caseChallenges: { type: String, default: '' },
    caseSolutions: { type: String, default: '' },
    caseOptimization: { type: String, default: '' },
    caseLearnings: { type: String, default: '' },
    filterAll: { type: String, default: '' },
    filterFullstack: { type: String, default: '' },
    filterFrontend: { type: String, default: '' },
    filterBackend: { type: String, default: '' },
    catLanguage: { type: String, default: '' },
    catFramework: { type: String, default: '' },
    catDatabase: { type: String, default: '' },
    catTool: { type: String, default: '' },
    catCloud: { type: String, default: '' },
    catConcept: { type: String, default: '' },
    cpCurrentRating: { type: String, default: '' },
    cpMaxRating: { type: String, default: '' },
    cpContests: { type: String, default: '' },
    cpUnrated: { type: String, default: '' },
    cpCfProfile: { type: String, default: '' },
    cpRatingHistory: { type: String, default: '' },
    cpLeetcode: { type: String, default: '' },
    cpLcProfile: { type: String, default: '' },
    cpSolved: { type: String, default: '' },
    cpEasy: { type: String, default: '' },
    cpMedium: { type: String, default: '' },
    cpHard: { type: String, default: '' },
    cpSubmissionActivity: { type: String, default: '' },
    cpCodechef: { type: String, default: '' },
    cpHighest: { type: String, default: '' },
    cpCcProfile: { type: String, default: '' },
    btnBack: { type: String, default: '' },
    backToProjects: { type: String, default: '' },
    backToBlog: { type: String, default: '' },
    btnSourceCode: { type: String, default: '' },
    btnLiveDemo: { type: String, default: '' },
    btnCaseStudy: { type: String, default: '' },
    badgeFeatured: { type: String, default: '' },
    badgeVideo: { type: String, default: '' },
    btnShare: { type: String, default: '' },
    unitViews: { type: String, default: '' },
    unitMinRead: { type: String, default: '' },
    unitMin: { type: String, default: '' },
    headingHighlights: { type: String, default: '' },
    headingRelated: { type: String, default: '' },
    toastLinkCopied: { type: String, default: '' },
    toastCopyFailed: { type: String, default: '' },
    searchPlaceholder: { type: String, default: '' },
    searchAria: { type: String, default: '' },
  },
  { _id: false }
);

const emailSchema = new mongoose.Schema(
  {
    ownerSubjectPrefix: { type: String, default: '' },
    ownerHeading: { type: String, default: '' },
    ackFromName: { type: String, default: '' },
    ackSubject: { type: String, default: '' },
    ackHeading: { type: String, default: '' },
    ackGreeting: { type: String, default: '' },
    ackBody: { type: String, default: '' },
    ackSignoff: { type: String, default: '' },
  },
  { _id: false }
);

const siteContentSchema = new mongoose.Schema<ISiteContent>(
  {
    sections: {
      type: [{ key: String, index: String, title: String, subtitle: String }],
      default: [],
    },
    hero: { type: heroSchema, default: () => ({}) },
    about: { type: aboutSchema, default: () => ({}) },
    footer: { type: footerSchema, default: () => ({}) },
    nav: { type: navSchema, default: () => ({}) },
    states: { type: statesSchema, default: () => ({}) },
    forms: { type: formsSchema, default: () => ({}) },
    auth: { type: authSchema, default: () => ({}) },
    labels: { type: labelsSchema, default: () => ({}) },
    email: { type: emailSchema, default: () => ({}) },
  },
  { timestamps: true }
);

export const SiteContent =
  (mongoose.models.SiteContent as Model<ISiteContent>) ||
  mongoose.model<ISiteContent>('SiteContent', siteContentSchema);
export default SiteContent;
