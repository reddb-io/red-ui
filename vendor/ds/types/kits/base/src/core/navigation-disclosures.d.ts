/** A shell coordinates independent navigation disclosures without choosing any layout. */
export declare function createNavigationDisclosures(): {
    register(close: () => void): {
        open(): void;
        destroy(): void;
    };
};
