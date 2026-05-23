declare module "node-cron" {
  export interface ScheduledTask {
    start(): void;
    stop(): void;
    destroy(): void;
  }

  export interface ScheduleOptions {
    timezone?: string;
    scheduled?: boolean;
    name?: string;
    recoverMissedExecutions?: boolean;
  }

  const cron: {
    schedule(
      expression: string,
      task: () => void | Promise<void>,
      options?: ScheduleOptions,
    ): ScheduledTask;
    validate(expression: string): boolean;
  };

  export default cron;
}
