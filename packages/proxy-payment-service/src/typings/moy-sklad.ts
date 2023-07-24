type SalePoint = {
  id: string;
  name: string;
  authTokenAttached: boolean;
};

type TokenAttached = {
  token: string;
};

export { SalePoint, TokenAttached };
