/**
 * Utility functions for deriving review status from action items count
 */

export type ReviewStatus = 'Clean' | 'Review' | 'Action' | 'processing' | 'failed';

/**
 * Derives the status from action items count
 * @param actionItemsCount - The number of action items
 * @returns The derived status string
 */
export function getReviewStatus(actionItemsCount: number | null | undefined): 'Clean' | 'Review' | 'Action' {
  if (actionItemsCount === null || actionItemsCount === undefined) {
    return 'Clean';
  }
  
  if (actionItemsCount === 0) {
    return 'Clean';
  }
  
  if (actionItemsCount >= 1 && actionItemsCount <= 3) {
    return 'Review';
  }
  
  return 'Action';
}

/**
 * Gets a color class for the status based on action items count
 * @param actionItemsCount - The number of action items
 * @returns Tailwind color classes
 */
export function getStatusColorClass(actionItemsCount: number | null | undefined): string {
  const status = getReviewStatus(actionItemsCount);
  
  switch (status) {
    case 'Clean':
      return 'bg-green-500 hover:bg-green-600';
    case 'Review':
      return 'bg-yellow-500 hover:bg-yellow-600';
    case 'Action':
      return 'bg-red-500 hover:bg-red-600';
    default:
      return 'bg-gray-500 hover:bg-gray-600';
  }
}
