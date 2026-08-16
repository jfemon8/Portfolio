import mongoose, { type Connection, type Model } from 'mongoose';
import { env } from '../../config/env.js';
import { Job } from '../../models/Job.js';
import { JobSourceHealth } from '../../models/JobSourceHealth.js';
import type { IJob, IJobSourceHealth } from '../../types/index.js';

let cached: Promise<AgentModels> | null = null;

export interface AgentModels {
  Job: Model<IJob>;
  JobSourceHealth: Model<IJobSourceHealth>;
  /** False when the agent fell back to the application's own connection. */
  scoped: boolean;
}

const connect = async (uri: string): Promise<Connection> => {
  const connection = mongoose.createConnection(uri, {
    serverSelectionTimeoutMS: 10_000,
    maxPoolSize: 3,
  });
  await connection.asPromise();
  return connection;
};

/** Gives the agent its own least-privilege connection when JOBS_AGENT_MONGODB_URI is set. */
export async function getAgentModels(): Promise<AgentModels> {
  const uri = env.jobSync.agentUri;
  if (!uri) return { Job, JobSourceHealth, scoped: false };

  cached ??= (async () => {
    try {
      const connection = await connect(uri);
      return {
        Job: connection.model<IJob>('Job', Job.schema),
        JobSourceHealth: connection.model<IJobSourceHealth>(
          'JobSourceHealth',
          JobSourceHealth.schema
        ),
        scoped: true,
      };
    } catch (error) {
      // A broken agent credential must not take the whole sync down silently.
      cached = null;
      console.warn(
        `⚠️  JOBS_AGENT_MONGODB_URI unusable (${error instanceof Error ? error.message : 'unknown'}) — falling back to the app connection.`
      );
      return { Job, JobSourceHealth, scoped: false };
    }
  })();

  return cached;
}
