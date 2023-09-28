export const industryActivity = Object.freeze({
  '1': {
    'activityID': 1,
    'description': 'Manufacturing of things',
    'activityName': 'Manufacturing'
  },
  '3': {
    'activityID': 3,
    'description': 'Researching time efficiency',
    'activityName': 'TE Research',
  },
  '4': {
    'activityID': 4,
    'description': 'Researching material efficiency',
    'activityName': 'ME Research',
  },
  '5': {
    'activityID': 5,
    'description': 'Making blueprint copies',
    'activityName': 'Copying'
  },
  '8': {
    'activityID': 8,
    'description': 'The process of creating a more advanced item based on an existing item',
    'activityName': 'Invention'
  },
  '9': {
    'activityID': 9,
    'description': 'The process of combining raw and intermediate materials to create advanced components',
    'activityName': 'Reactions'
  }
});

export type IndustryActivityKey = keyof typeof industryActivity;

export const MANUFACTURING = 1;
export const REACTION = 9;