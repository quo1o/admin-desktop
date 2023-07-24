class HumanizedError extends Error {
  constructor (humanizedMessage: string, message = humanizedMessage) {
    super(message);

    this.humanizedMessage = humanizedMessage;
  }

  humanizedMessage: string;
}

export default HumanizedError;
