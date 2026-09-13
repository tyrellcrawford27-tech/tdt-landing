import type { ChatTurn, TrainingTopic } from './trainingAssistant';

// Illustrative product story, not a testimonial or the visitor's chat history.
// These exchanges stay in the UI and never go to the reply API as user facts.
export const JOURNEY_ATHLETE = { name: 'Tyrell', age: 17, goal: 'College basketball' };
export type StoryTurn = ChatTurn & { time: string };

export const TRAINING_STORIES = {
  film: [
    { role: 'user', content: 'Coach! Just uploaded my first full game. I want to play in college, so I’m excited to see what I need to work on.', time: '4:12 PM' },
    { role: 'assistant', content: 'Love that, Tyrell. I’ll look at the decisions behind each play so we can find your first focus, not just watch the highlights.', time: '4:13 PM' },
    { role: 'user', content: 'Let’s do it. I feel good in workouts, but in games I rush or hesitate.', time: '4:14 PM' },
  ],
  review: [
    { role: 'assistant', content: 'Tyrell, see these clips from our review? You’re catching the ball before checking the help defender, so your decision starts late.', time: '6:10 PM' },
    { role: 'user', content: 'Now I see why I get stuck. I’m trying to figure everything out after I catch it.', time: '6:11 PM' },
    { role: 'assistant', content: 'Exactly. I’ve added a drill for that first look, so we can practise spotting the help before you catch and make your move.', time: '6:12 PM' },
  ],
  practice: [
    { role: 'user', content: 'Coach, that drill helped in today’s game! I saw the help early and found the open teammate instead of forcing the drive.', time: '5:26 PM' },
    { role: 'assistant', content: 'That’s the read we worked on, Tyrell. Keep building it, then send me the next game so we can see what’s sticking.', time: '5:27 PM' },
    { role: 'user', content: 'Still lots to work on, but I know what I’m looking for now. Going to ask the group how they practise that read too.', time: '5:28 PM' },
  ],
} satisfies Record<TrainingTopic, StoryTurn[]>;

export const COMMUNITY_STORY_MESSAGES = {
  EJ: 'Reading the help early. Any tips?',
  AN: 'I’m working on that too, Elijah.',
  TL: 'I mix up reads with a teammate.',
  TC: 'Let’s compare our next game clips.',
};
