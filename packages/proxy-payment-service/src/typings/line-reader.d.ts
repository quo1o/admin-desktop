interface LineReader {
	eachLine(
    file: string,
    cb: (line: string, last?: boolean, cb?: Function) => void,
    endCb: (err?: Error) => void,
  ): LineReader;
	eachLine(
    file: string,
    options: LineReaderOptions,
    cb: (line: string, last?: boolean, cb?: Function) => void,
    endCb: (err?: Error) => void,
  ): LineReader;
}
