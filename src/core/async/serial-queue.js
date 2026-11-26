/** Serialize work within one owner. Rejected tasks do not poison later work. */
export function createSerialQueue() {
  let tail = Promise.resolve();
  return task => {
    const result = tail.then(task);
    tail = result.catch(() => {});
    return result;
  };
}
