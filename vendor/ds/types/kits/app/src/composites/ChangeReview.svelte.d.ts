export type { ReviewChange, ReviewState } from "../core/change-review";
import type { ChangeReviewContract } from "../core/contracts/changereview";
interface Props extends ChangeReviewContract {
    /** Additional composition classes. */
    class?: string;
}
declare const ChangeReview: import("svelte").Component<Props, {}, "">;
type ChangeReview = ReturnType<typeof ChangeReview>;
export default ChangeReview;
