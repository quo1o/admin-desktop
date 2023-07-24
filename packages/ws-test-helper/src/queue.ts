class Queue<T> {
  constructor () {
    this.pendingItems = [];
    this.nextItemResolvers = [];
  }

  private pendingItems: T[];
  private nextItemResolvers: Array<(item: T) => void>;

  put (item: T) {
    const resolveNextItem = this.nextItemResolvers.shift();
    if (resolveNextItem) resolveNextItem(item);
    else this.pendingItems.push(item);
  }

  get () {
    const item = this.pendingItems.shift();

    if (item) {
      return Promise.resolve(item);
    }

    const nextItem: Promise<T> = new Promise((resolve) => {
      this.nextItemResolvers.push(resolve);
    });

    return nextItem;
  }
}

export default Queue;
