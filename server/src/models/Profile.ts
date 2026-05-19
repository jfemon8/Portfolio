import mongoose, { type Model } from 'mongoose';
import type { IProfile } from '../types/index.js';

const socialSchema = new mongoose.Schema(
  { label: String, url: String, icon: String },
  { _id: false }
);

const profileSchema = new mongoose.Schema<IProfile>(
  {
    name: { type: String, required: true },
    title: { type: String, required: true },
    tagline: { type: String, default: '' },
    summary: { type: String, default: '' },
    roles: { type: [String], default: [] },
    location: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    avatar: { type: String, default: '' },
    avatarPublicId: { type: String, default: '' },
    resumeUrl: { type: String, default: '' },
    resumePublicId: { type: String, default: '' },
    socials: { type: [socialSchema], default: [] },
    stats: {
      type: [{ label: String, value: String }],
      default: [],
    },
    languages: {
      type: [{ name: String, level: String }],
      default: [],
    },
    available: { type: Boolean, default: true },
    codeforcesHandle: { type: String, default: '' },
    leetcodeHandle: { type: String, default: '' },
    codechefHandle: { type: String, default: '' },
  },
  { timestamps: true }
);

export const Profile =
  (mongoose.models.Profile as Model<IProfile>) ||
  mongoose.model<IProfile>('Profile', profileSchema);
export default Profile;
