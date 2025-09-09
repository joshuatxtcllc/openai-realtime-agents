import { authenticationAgent } from './authentication';
import { returnsAgent } from './returns';
import { framingSalesAgent } from './sales';
import { simulatedHumanAgent } from './simulatedHuman';

// Cast to `any` to satisfy TypeScript until the core types make RealtimeAgent
// assignable to `Agent<unknown>` (current library versions are invariant on
// the context type).
(authenticationAgent.handoffs as any).push(returnsAgent, framingSalesAgent, simulatedHumanAgent);
(returnsAgent.handoffs as any).push(authenticationAgent, framingSalesAgent, simulatedHumanAgent);
(framingSalesAgent.handoffs as any).push(authenticationAgent, returnsAgent, simulatedHumanAgent);
(simulatedHumanAgent.handoffs as any).push(authenticationAgent, returnsAgent, framingSalesAgent);

export const customerServiceRetailScenario = [
  authenticationAgent,
  returnsAgent,
  framingSalesAgent,
  simulatedHumanAgent,
];

// Name of the company represented by this agent set. Used by guardrails
export const customerServiceRetailCompanyName = 'Jay\'s Frames custom art framing';
