/**
 * Database seeder — populates the portfolio with data extracted from
 * Md Jannatul Ferdhous Emon's CV, and creates the initial admin account.
 *
 *   npm run seed          upsert content + ensure admin
 *   npm run seed:fresh    wipe content collections, then seed
 *   npm run create:admin  admin account only
 *
 * Messages & analytics are NEVER wiped.
 */
import type { Model } from 'mongoose';
import slugify from 'slugify';
import { connectDB } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { User } from '../src/models/User.js';
import { IMMUTABLE_SUPER_ADMINS } from '../src/config/superAdmins.js';
import { Profile } from '../src/models/Profile.js';
import { Experience } from '../src/models/Experience.js';
import { Project } from '../src/models/Project.js';
import { Skill } from '../src/models/Skill.js';
import { Education } from '../src/models/Education.js';
import { Certification } from '../src/models/Certification.js';
import { Publication } from '../src/models/Publication.js';
import { BlogPost } from '../src/models/BlogPost.js';
import { Tool } from '../src/models/Tool.js';
import type {
  IBlogPost,
  ICertification,
  IEducation,
  IExperience,
  IProfile,
  IProject,
  IPublication,
  ISkill,
  ITool,
  SkillCategory,
} from '../src/types/index.js';

const args = process.argv.slice(2);
const FRESH = args.includes('--fresh');
const ADMIN_ONLY = args.includes('--admin-only');

/* ---------------------------------------------------------------- DATA */

const profile: Partial<IProfile> = {
  name: 'Md Jannatul Ferdhous Emon',
  title: 'Assistant Front End Developer',
  tagline:
    'I build responsive, dynamic & scalable web apps with the MERN stack.',
  summary:
    'I am a dedicated and curious learner currently working as an Assistant Front-End Developer, where I build responsive and user-friendly web applications using modern technologies such as HTML, CSS, JavaScript, React, and .NET. I also bring hands-on experience in Shopify development, along with a strong understanding of cross-browser compatibility and UI best practices. With a solid foundation in front-end development and a growing interest in full-stack and software engineering, I am seeking opportunities to deepen my technical expertise and contribute to impactful projects. My goal is to evolve as a well-rounded software engineer in a dynamic and growth-oriented environment.',
  roles: [
    'Assistant Front-End Developer',
    'MERN Stack Developer',
    'Competitive Programmer',
    'Problem Solver',
  ],
  location: 'West Shewrapara, Mirpur, Dhaka-1216, Bangladesh',
  email: 'jfemon8@gmail.com',
  phone: '+8801735626822',
  available: true,
  socials: [
    {
      label: 'GitHub',
      url: 'https://github.com/your-username',
      icon: 'github',
    },
    {
      label: 'LinkedIn',
      url: 'https://linkedin.com/in/your-username',
      icon: 'linkedin',
    },
    {
      label: 'LeetCode',
      url: 'https://leetcode.com/your-username',
      icon: 'code',
    },
    { label: 'Email', url: 'mailto:jfemon8@gmail.com', icon: 'mail' },
  ],
  stats: [
    { label: 'Problems Solved', value: '1000+' },
    { label: 'Contests', value: '100+' },
    { label: 'Codeforces', value: 'Pupil' },
    { label: 'CodeChef', value: '3★' },
  ],
  languages: [
    { name: 'Bengali', level: 'Native' },
    { name: 'English', level: 'Fluent' },
  ],
};

const experiences: IExperience[] = [
  {
    role: 'Assistant Front End Developer',
    company: 'OnnoRokom Projukti Limited',
    location:
      'Tropical Noor Tower, 40 Kazi Nazrul Islam Avenue, Karwan Bazar, Dhaka-1215',
    startDate: 'June 2025',
    endDate: 'Present',
    current: true,
    type: 'full-time',
    highlights: [
      'Develop and maintain responsive web applications using HTML, CSS, JavaScript, jQuery, React, Redux, Next.js, ensuring cross-browser compatibility and performance.',
      'Collaborate on backend integration using .NET MVC and .NET Core Web API and apply OOP principles (C#) to support dynamic, scalable features.',
      'Contribute to asynchronous operations like AJAX, fetch, Axios, participate in code reviews, and continuously learn tools like Kubernetes, Terraform, and monitoring systems.',
    ],
    tech: ['React', 'Redux', 'Next.js', 'jQuery', '.NET Core', 'C#', 'Axios'],
    order: 0,
  },
  {
    role: 'Junior Web Developer',
    company: 'SM Technology',
    location:
      'Police Park, House 05, Road 10, Block D, Banasree, Khilgaon, Dhaka-1219',
    startDate: 'May 2025',
    endDate: 'June 2025',
    current: false,
    type: 'full-time',
    highlights: [
      'Built and customized responsive Shopify websites from Figma designs using HTML, CSS, and JavaScript.',
      'Ensured cross-browser compatibility, performance optimization, and clean code practices.',
      'Collaborated with the team and continuously grew within the Shopify ecosystem.',
    ],
    tech: ['Shopify', 'HTML', 'CSS', 'JavaScript', 'Figma'],
    order: 1,
  },
  {
    role: 'SQA Tester',
    company: 'University of Barishal',
    location: 'Kornokathi, Barishal-8254, Bangladesh',
    startDate: 'October 2022',
    endDate: 'March 2023',
    current: false,
    type: 'part-time',
    highlights: [
      'Member of the software testing team for the university admission process.',
      'Discovered and documented bugs and usability issues.',
      'Provided feedback for design and functionality improvements.',
    ],
    tech: ['Manual Testing', 'Bug Reporting', 'QA'],
    order: 2,
  },
];

const projects: Partial<IProject>[] = [
  {
    title: 'RDSWA',
    tagline: 'Full-stack MERN + TypeScript community platform',
    summary:
      'A full-stack MERN + TypeScript platform with authentication, role-based permissions, background sync jobs, real-time chat and notifications.',
    description:
      '## Overview\nRDSWA is a full-stack platform built and shipped end-to-end with the MERN stack and TypeScript.\n\n## What I built\n- Designed the authentication system and role-based permissions (RBAC).\n- Implemented background sync jobs for data consistency.\n- Added real-time chat and notifications.\n- Built a polished React front-end with dark / light theme support.\n\n## Tech\nReact, TypeScript, Node, Express, MongoDB, Cloudinary.',
    techStack: [
      'React',
      'TypeScript',
      'Node',
      'Express',
      'MongoDB',
      'Cloudinary',
    ],
    highlights: [
      'Built and shipped a full-stack MERN + TypeScript platform',
      'Designed authentication, role-based permissions, and background sync jobs',
      'Added real-time chat, notifications, and dark/light theme React front-end',
    ],
    category: 'fullstack',
    sourceUrl: 'https://github.com/your-username/rdswa',
    liveUrl: '',
    featured: true,
    status: 'completed',
    year: '2024',
    order: 0,
  },
  {
    title: 'Bangaliyana',
    tagline: 'Multi-vendor e-commerce platform (ASP.NET Core)',
    summary:
      'A full-featured multi-vendor e-commerce platform with role-based auth, real-time messaging and local payment gateways.',
    description:
      '## Overview\nBangaliyana is a multi-vendor e-commerce platform built with ASP.NET Core and Entity Framework Core.\n\n## Highlights\n- Role-based authentication & authorization with ASP.NET Core Identity (Admin, Seller, Customer).\n- Real-time notifications and messaging using SignalR.\n- Integrated local payment gateways: bKash, Nagad, SSLCommerz with order tracking and delivery management.',
    techStack: [
      'ASP.NET Core',
      'Entity Framework Core',
      'SQL Server',
      'SignalR',
      'Bootstrap',
    ],
    highlights: [
      'Developed a full-featured multi-vendor e-commerce platform',
      'Role-based authentication & authorization (Admin, Seller, Customer)',
      'Real-time notifications & messaging using SignalR',
      'Integrated bKash, Nagad & SSLCommerz with order tracking',
    ],
    category: 'fullstack',
    sourceUrl: 'https://github.com/your-username/bangaliyana',
    featured: true,
    status: 'completed',
    year: '2023',
    order: 1,
  },
  {
    title: 'QuickQuiz',
    tagline: 'Responsive quiz platform with Firebase',
    summary:
      'A responsive quiz platform with Firebase auth, category search, instant results and a protected admin panel.',
    description:
      '## Overview\nQuickQuiz is a responsive quiz platform built with React, Context API and Tailwind CSS.\n\n## Features\n- Firebase Authentication for secure login and role-based access.\n- Category search, Firestore-based data handling, instant results and answer review.\n- Admin panel with protected routes for category and question management.',
    techStack: [
      'React',
      'Tailwind CSS',
      'Firebase',
      'Firestore',
      'React Router',
      'Context API',
    ],
    highlights: [
      'Built a responsive quiz platform with React + Context API',
      'Firebase Authentication with role-based access',
      'Category search, instant results & answer review',
      'Admin panel with protected routes',
    ],
    category: 'frontend',
    sourceUrl: 'https://github.com/your-username/quickquiz',
    featured: true,
    status: 'completed',
    year: '2023',
    order: 2,
  },
  {
    title: 'AgriBlog',
    tagline: 'Clean & modern dynamic blogging website',
    summary:
      'A clean, modern dynamic blogging website with search, theme switching, an admin panel and authentication.',
    description:
      '## Overview\nAgriBlog is a dynamic blogging website built with vanilla JavaScript, PHP and MySQL.\n\n## Features\n- Search bar and light/dark theme switching.\n- Admin panel with an authentication system.\n- Deployed on GitHub Pages via GitHub Actions.',
    techStack: ['JavaScript', 'HTML', 'CSS', 'PHP', 'MySQL'],
    highlights: [
      'Clean and modern dynamic blogging website',
      'Search bar and theme switching mode',
      'Admin panel and authentication system',
      'Deployed via GitHub Actions',
    ],
    category: 'fullstack',
    sourceUrl: 'https://github.com/your-username/agriblog',
    featured: false,
    status: 'completed',
    year: '2022',
    order: 3,
  },
];

const skillRows: [string, SkillCategory, number][] = [
  ['C/C++', 'language', 85],
  ['C#', 'language', 80],
  ['Python', 'language', 78],
  ['PHP', 'language', 72],
  ['JavaScript', 'language', 88],
  ['TypeScript', 'language', 80],
  ['HTML/CSS', 'language', 92],
  ['SQL (MySQL)', 'database', 80],
  ['React', 'framework', 88],
  ['Redux', 'framework', 80],
  ['Next.js', 'framework', 78],
  ['Node.js', 'framework', 80],
  ['Express', 'framework', 80],
  ['Django', 'framework', 68],
  ['jQuery', 'framework', 82],
  ['Tailwind CSS', 'framework', 88],
  ['Bootstrap', 'framework', 85],
  ['DaisyUI', 'framework', 80],
  ['.NET Core', 'framework', 75],
  ['ASP.NET Core', 'framework', 74],
  ['MongoDB', 'database', 82],
  ['SQL Server', 'database', 72],
  ['Git & GitHub', 'tool', 88],
  ['VS Code', 'tool', 92],
  ['Visual Studio', 'tool', 80],
  ['TortoiseGit', 'tool', 75],
  ['Shopify', 'tool', 78],
  ['Firebase', 'cloud', 78],
  ['Cloudinary', 'cloud', 75],
  ['Data Structures & Algorithms', 'concept', 88],
  ['Object Oriented Programming', 'concept', 85],
];

const FEATURED_SKILLS = [
  'React',
  'JavaScript',
  'Node.js',
  'MongoDB',
  'TypeScript',
  'Express',
];

const skills: ISkill[] = skillRows.map(([name, category, level], i) => ({
  name,
  category,
  level,
  icon: '',
  iconImage: '',
  iconImagePublicId: '',
  order: i,
  featured: FEATURED_SKILLS.includes(name),
}));

const education: IEducation[] = [
  {
    institution: 'University of Barishal',
    degree: 'Bachelor of Science',
    field: 'Computer Science and Engineering',
    location: 'Kornokathi, Barishal-8254, Bangladesh',
    startYear: '2019',
    endYear: '2023',
    grade: 'CGPA: 3.38',
    description: '',
    order: 0,
  },
  {
    institution: 'Collectorate School and College',
    degree: 'Higher Secondary School Certificate',
    field: 'Science Group',
    location: 'New Sen Para Rd, Rangpur-5400, Bangladesh',
    startYear: '2016',
    endYear: '2018',
    grade: 'GPA: 4.67',
    description: '',
    order: 1,
  },
  {
    institution: "Sundarganj Abdul Majid Govt. Boys' High School",
    degree: 'Secondary School Certificate',
    field: 'Science Group',
    location: 'Sundarganj, Gaibandha-5720, Bangladesh',
    startYear: '2014',
    endYear: '2016',
    grade: 'GPA: 5.00',
    description: '',
    order: 2,
  },
];

const certifications: Partial<ICertification>[] = [
  {
    title: 'Certified Competitive Programmer',
    issuer: 'Phitron',
    category: 'certification',
    order: 0,
  },
  {
    title: 'Certified Intermediate SQL Database Administrator',
    issuer: 'HackerRank',
    category: 'certification',
    order: 1,
  },
  {
    title: 'Certified Basic Problem Solver',
    issuer: 'HackerRank',
    category: 'certification',
    order: 2,
  },
  {
    title: 'Certified Web Developer',
    issuer: 'Information and Communication Technology Division',
    category: 'certification',
    order: 3,
  },
  {
    title: 'Pupil on Codeforces',
    issuer: 'Codeforces',
    category: 'achievement',
    order: 4,
  },
  {
    title: '3 Star Coder on CodeChef',
    issuer: 'CodeChef',
    category: 'achievement',
    order: 5,
  },
  {
    title: 'Solved 1000+ problems on different online judges',
    issuer: 'Competitive Programming',
    category: 'achievement',
    order: 6,
  },
  {
    title: 'Participated in 100+ programming contests',
    issuer: 'Competitive Programming',
    category: 'achievement',
    order: 7,
  },
];

const publications: Partial<IPublication>[] = [
  {
    title:
      'Detecting Code Smells in Python Using Ensemble Learning with Advanced Resampling Techniques',
    venue: 'Research Publication',
    authors: 'Md Jannatul Ferdhous Emon, et al.',
    year: '',
    url: '',
    abstract:
      'A study on detecting code smells in Python source code using ensemble machine-learning models combined with advanced data-resampling techniques to handle class imbalance.',
    order: 0,
  },
];

// upsertMany() goes through findOneAndUpdate, which — unlike Model.create() — never fires the Tool schema's slug-derive pre('validate') hook, so slugs are computed here instead of left blank (blank would collide on the unique index after the 2nd upsert).
const toolsRaw: Omit<ITool, 'slug'>[] = [
  {
    name: 'JWT Decoder',
    description:
      'Decode a JWT to see its header and payload — entirely in your browser, nothing is sent anywhere.',
    category: 'developer-utilities',
    icon: 'KeyRound',
    key: 'jwt-decoder',
    order: 0,
  },
  {
    name: 'JSON Formatter',
    description:
      'Paste JSON and get it pretty-printed, minified, or validated with clear error messages.',
    category: 'developer-utilities',
    icon: 'Braces',
    key: 'json-formatter',
    order: 1,
  },
  {
    name: 'Regex Tester',
    description:
      'Test a regular expression against sample text with live match highlighting and capture groups.',
    category: 'developer-utilities',
    icon: 'Regex',
    key: 'regex-tester',
    order: 2,
  },
  {
    name: 'CP Profile Comparer',
    description:
      'Compare two Codeforces handles side by side — rating, max rating, rank, and contest count.',
    category: 'competitive-programming',
    icon: 'GitCompare',
    key: 'cp-profile-comparer',
    order: 3,
  },
  {
    name: 'Codeforces Rating Predictor',
    description:
      'Get an unofficial predicted rating delta for a Codeforces contest, right after it finishes.',
    category: 'competitive-programming',
    icon: 'TrendingUp',
    key: 'cf-rating-predictor',
    order: 4,
  },
];

const tools: ITool[] = toolsRaw.map((t) => ({
  ...t,
  slug: slugify(t.name, { lower: true, strict: true }),
}));

const sampleBlog: Partial<IBlogPost> = {
  title: 'Welcome to My Developer Journey',
  excerpt:
    'A quick intro to who I am, what I build, and what you can expect from this blog.',
  content:
    "# Welcome 👋\n\nI'm **Md Jannatul Ferdhous Emon**, an Assistant Front-End Developer who loves turning ideas into fast, accessible, and delightful web apps.\n\nThis blog is where I'll share:\n\n- Notes from building **MERN** + **.NET** applications\n- **Competitive programming** writeups (1000+ problems and counting!)\n- Lessons learned shipping real products\n\nThanks for stopping by — more soon!",
  tags: ['intro', 'mern', 'career'],
  category: 'General',
  status: 'published',
  featured: true,
};

/* ------------------------------------------------------------- RUNNER */

/**
 * Idempotently ensure BOTH hardcoded immutable super admins exist and are
 * locked to { role: 'superAdmin', status: 'active', isImmutableSuperAdmin }.
 * Existing accounts (e.g. the live `jfemon8@gmail.com`) are upgraded in place
 * WITHOUT touching their password.
 */
async function ensureSuperAdmins(): Promise<void> {
  for (const email of IMMUTABLE_SUPER_ADMINS) {
    const lock = {
      role: 'superAdmin' as const,
      status: 'active' as const,
      isImmutableSuperAdmin: true,
    };
    const existing = await User.findOne({ email });
    if (existing) {
      await User.updateOne({ email }, lock);
      console.log(`👑 Super admin ensured (upgraded): ${email}`);
    } else {
      const name = email === env.admin.email ? env.admin.name : 'Super Admin';
      await User.create({ name, email, password: env.admin.password, ...lock });
      console.log(
        `👑 Super admin created: ${email} (bootstrap password = ADMIN_PASSWORD — change it after first login)`
      );
    }
  }
}

async function upsertMany<T>(
  Model: Model<T>,
  docs: Partial<T>[],
  key: keyof T
): Promise<void> {
  for (const d of docs) {
    await Model.findOneAndUpdate({ [key]: d[key] }, d, {
      upsert: true,
      setDefaultsOnInsert: true,
    });
  }
  console.log(`✅ ${Model.modelName}: ${docs.length} records`);
}

async function seedContent(): Promise<void> {
  if (FRESH) {
    console.log('🧹 Wiping content collections (--fresh)...');
    await Promise.all([
      Profile.deleteMany({}),
      Experience.deleteMany({}),
      Project.deleteMany({}),
      Skill.deleteMany({}),
      Education.deleteMany({}),
      Certification.deleteMany({}),
      Publication.deleteMany({}),
      Tool.deleteMany({}),
    ]);
  }

  await Profile.findOneAndUpdate({}, profile, {
    upsert: true,
    setDefaultsOnInsert: true,
  });
  console.log('✅ Profile seeded');

  await upsertMany(Experience, experiences, 'company');
  for (const p of projects) {
    if (!(await Project.findOne({ title: p.title }))) await Project.create(p);
  }
  console.log(`✅ Project: ${projects.length} records`);
  await upsertMany(Skill, skills, 'name');
  await upsertMany(Education, education, 'institution');
  await upsertMany(Certification, certifications, 'title');
  await upsertMany(Publication, publications, 'title');
  await upsertMany(Tool, tools, 'key');

  if (!(await BlogPost.findOne({ title: sampleBlog.title }))) {
    await BlogPost.create(sampleBlog);
    console.log('✅ Sample blog post created');
  }
}

async function run(): Promise<void> {
  try {
    await connectDB();
    console.log('\n🌱 Seeding database...\n');
    await ensureSuperAdmins();
    if (!ADMIN_ONLY) await seedContent();
    console.log('\n🎉 Done!\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Seed failed:', err);
    process.exit(1);
  }
}

void run();
