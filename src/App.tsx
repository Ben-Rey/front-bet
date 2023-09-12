"use client"; // This is a client component 👈🏽
import { useEffect, useState } from "react";
import { IAccount, IProvider, providers } from "@massalabs/wallet-provider";
import pollAsyncEvents from "./pollAsyncEvent";
import keccak256 from "@indeliblelabs/keccak256";

import {
  Args,
  toMAS,
  Client,
  IClient,
  ClientFactory,
  fromMAS,
} from "@massalabs/massa-web3";

const CONTRACT_ADDRESS =
  "AS129uUT31TymFCpBxGmccUEvWk2WkdQ1No68KnmkgHEPDzP9K1z6";
let _priceKey = keccak256("BTC-USD");

const getWallet = async (walletName: string) => {
  const wallets = await providers();
  const _wallet = wallets.find((wallet) => {
    if (wallet.name() === walletName) {
      return wallet;
    }
  });

  return _wallet;
};

export default function Home() {
  const [wallet, setWallet] = useState<IProvider | null>(null);
  const [accounts, setAccounts] = useState<IAccount[]>([]);
  const [client, setClient] = useState<Client | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<IAccount | null>(null);
  const [finalBalance, setFinalBalance] = useState<string | null>(null);
  const [opId, setOpId] = useState<string | null>(null);
  const [betDataKey, setBetDataKey] = useState<Uint8Array | null>(null);

  const initAccount = async (wallet: IProvider) => {
    const accounts: IAccount[] = await wallet.accounts();
    if (!accounts.length) {
    }
    return accounts;
  };

  const initClientWallet = async (wallet: IProvider, account: IAccount) => {
    return await ClientFactory.fromWalletProvider(wallet, account);
  };

  const init = async (chosenWallet: string) => {
    const wallet = await getWallet(chosenWallet);

    if (!wallet) return;
    setWallet(wallet);

    const accounts: IAccount[] = await initAccount(wallet);

    if (!accounts.length) return;
    setAccounts(accounts);

    const account = accounts[0];

    setSelectedAccount(account);

    const client = await initClientWallet(wallet, account);
    setClient(client);

    // const web3Account = ClientFactory.createDefaultClient(
    //   DefaultProviderUrls.LABNET, // provider
    //   true, // retry strategy
    //   await WalletClient.getAccountFromSecretKey("") // base account
    // );
  };

  const getBalance = async (client: IClient, accountAddress: string) => {
    if (!client) return;
    selectedAccount?.balance().then((balance) => {});

    const balance = await client.wallet().getAccountBalance(accountAddress);

    setFinalBalance(balance?.final.toString() || null);

    return balance?.final.toString();
  };

  /* -------------------------------------------------------------------------- */
  /*                                  FUNCTIONS                                 */
  /* -------------------------------------------------------------------------- */

  async function createBet() {
    if (!client) return;
    try {
      const result = await client.smartContracts().callSmartContract({
        fee: 0n,
        maxGas: 70_000_000n,
        // coins: 1_000_000_000n,
        // coins: fromMAS(0.1),
        // Minimum amount of coins to pay for storage cost
        coins: fromMAS(0.1),
        targetAddress: CONTRACT_ADDRESS,
        functionName: "createBet",
        parameter: new Args().addUint8Array(new Uint8Array(_priceKey)),
      });

      setOpId(result);
      const event: any = await pollAsyncEvents(client, result);
      console.log("[CREATE BET EVENT]: ", event);
      let msg = "New bet created with id: ";

      const _betDataKey = event[0]!.data.slice(msg.length);
      const betDataKey = new Uint8Array(
        Array.from(_betDataKey.split(","), (x) => parseInt(x, 10))
      );
      setBetDataKey(betDataKey);
    } catch (error) {
      console.log(error);
    }
  }

  async function bet() {
    if (!client) return;
    if (!betDataKey) {
      alert("You need to create a bet first");
      return;
    }
    try {
      let args = new Args().addUint8Array(betDataKey).addU8(0); // BetGuess.DECREASE
      const result = await client.smartContracts().callSmartContract({
        fee: 0n,
        maxGas: 70_000_000n,
        // Transfer coins (bet amount) + storage cost
        coins: fromMAS(1.1),
        targetAddress: CONTRACT_ADDRESS,
        functionName: "bet",
        parameter: args.serialize(),
      });

      setOpId(result);
      const event = await pollAsyncEvents(client, result);
      console.log("[BET EVENT]: ", event);
    } catch (error) {
      console.log(error);
    }
  }

  async function closeBet() {
    if (!client) return;

    try {
      const result = await client.smartContracts().callSmartContract({
        fee: 0n,
        // maxGas: 70_000_000n,
        // maxGas: 100_000_000n,
        maxGas: 500_000_000n,
        // No storage cost
        coins: fromMAS(0),
        targetAddress: CONTRACT_ADDRESS,
        functionName: "closeBet",
        parameter: new Args().addUint8Array(new Uint8Array(_priceKey)),
      });

      setOpId(result);
      const event = await pollAsyncEvents(client, result);
      console.log("[CLOSE BET EVENT]: ", event);
    } catch (error) {
      console.log(error);
    }
  }

  async function getGains() {
    if (!client) return;
    if (!betDataKey) {
      alert("You need to create a bet first");
      return;
    }
    try {
      const result = await client.smartContracts().callSmartContract({
        fee: 0n,
        maxGas: 70_000_000n,
        // No storage cost
        coins: fromMAS(0),
        targetAddress: CONTRACT_ADDRESS,
        functionName: "getGains",
        parameter: new Args().addUint8Array(betDataKey),
      });

      setOpId(result);
      const event = await pollAsyncEvents(client, result);
      console.log("[GET GAINS EVENT]: ", event);
    } catch (error) {
      console.log(error);
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                                END FUNCTIONS                               */
  /* -------------------------------------------------------------------------- */

  useEffect(() => {
    init("Bearby");
  }, []);

  useEffect(() => {
    const accountAddress = selectedAccount?.address();
    if (!accountAddress || !client) return;
    getBalance(client, accountAddress);
  }, [client, selectedAccount]);

  async function changeAccount(account: IAccount) {
    setSelectedAccount(account);
    const client = await initClientWallet(wallet!, account);
    setClient(client);
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-24">
      <div className="flex flex-col">
        <div className="flex gap-4">
          <BasicButton
            className="btn btn-neutral mb-4"
            onClick={async () => {
              await init("MASSASTATION");
            }}
          >
            Connect Massa Station
          </BasicButton>
          <BasicButton
            className="btn btn-neutral mb-4"
            onClick={async () => {
              await init("BEARBY");
            }}
          >
            Connect Bearby
          </BasicButton>
        </div>
        <SelectAccount
          accounts={wallet?.name() === "Massa Station" ? accounts : []}
          changeAccount={changeAccount}
        />
        <InfoBlock
          title="Wallet"
          content={wallet ? wallet.name() : "No wallet found"}
        />
        <InfoBlock
          title="Account"
          content={
            `...${selectedAccount?.address().slice(-10)}` || "No account found"
          }
        />
        <InfoBlock
          title="Balance"
          content={finalBalance ? toMAS(finalBalance).toString() : null}
        />
      </div>

      <div className="flex items-center gap-5 justify-center">
        <BasicButton onClick={createBet}>Create a bet</BasicButton>
        <BasicButton onClick={bet}>Bet</BasicButton>
        <BasicButton onClick={closeBet}>Close bet</BasicButton>
        <BasicButton onClick={getGains}>Get gains</BasicButton>
      </div>
    </main>
  );
}

const BasicButton = ({
  onClick,
  className,
  children,
}: {
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) => (
  <button className={`btn mb-4 ${className}`} onClick={onClick}>
    {children}
  </button>
);

const InfoBlock = ({
  title,
  content,
}: {
  title: string;
  content: string | null;
}) => {
  return (
    <div className="flex items-center bg-gray-100 p-4 rounded-lg shadow-md mb-4">
      <h2 className="text-xl font-bold text-gray-700 mr-2">{title}</h2>
      <p className="text-xl text-gray-600">{content}</p>
    </div>
  );
};

const SelectAccount = ({
  accounts,
  changeAccount,
}: {
  accounts: IAccount[];
  changeAccount: (account: IAccount) => void;
}) => {
  return (
    <details className="dropdown mb-4">
      <summary className="m-1 btn">
        {accounts
          ? "Select Account"
          : "You can only change account with Massa station"}
      </summary>
      {accounts?.length === 0 && (
        <ul className="p-2 shadow menu dropdown-content z-[1] bg-base-100 rounded-box w-52">
          {accounts.map((account) => (
            <li key={account.address()}>
              <a onClick={() => changeAccount(account)}>{account.address()}</a>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
};
