import {
  demicrofy,
  formatExecuteMsgNumber,
  formatFluidDecimalPoints,
  formatLuna,
  formatLunaInput,
  formatUST,
  LUNA_INPUT_MAXIMUM_DECIMAL_POINTS,
  LUNA_INPUT_MAXIMUM_INTEGER_POINTS,
  microfy,
} from '@anchor-protocol/notation';
import type {
  bLuna,
  Denom,
  Luna,
  Rate,
  ubLuna,
  uLuna,
} from '@anchor-protocol/types';
import { terraswap } from '@anchor-protocol/types';
import {
  useConnectedWallet,
  WalletReady,
} from '@anchor-protocol/wallet-provider';
import { useApolloClient } from '@apollo/client';
import { NativeSelect as MuiNativeSelect } from '@material-ui/core';
import { useOperation } from '@terra-dev/broadcastable-operation';
import { isZero } from '@terra-dev/is-zero';
import { ActionButton } from '@terra-dev/neumorphism-ui/components/ActionButton';
import { NumberMuiInput } from '@terra-dev/neumorphism-ui/components/NumberMuiInput';
import { SelectAndTextInputContainer } from '@terra-dev/neumorphism-ui/components/SelectAndTextInputContainer';
import { useResolveLast } from '@terra-dev/use-resolve-last';
import { useBank } from 'base/contexts/bank';
import { useConstants } from 'base/contexts/contants';
import { useContractAddress } from 'base/contexts/contract';
import { querySimulation } from 'base/queries/simulation';
import big from 'big.js';
import { IconLineSeparator } from 'components/IconLineSeparator';
import { MessageBox } from 'components/MessageBox';
import { TransactionRenderer } from 'components/TransactionRenderer';
import { SwapListItem, TxFeeList, TxFeeListItem } from 'components/TxFeeList';
import { validateTxFee } from 'logics/validateTxFee';
import { swapBurnSimulation } from 'pages/basset/logics/swapBurnSimulation';
import { swapGetSimulation } from 'pages/basset/logics/swapGetSimulation';
import React, {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { validateBurnAmount } from '../logics/validateBurnAmount';
import { SwapSimulation } from '../models/swapSimulation';
import { useTerraswapBLunaPrice } from '../queries/terraswapBLunaPrice';
import { swapOptions } from '../transactions/swapOptions';

interface Item {
  label: string;
  value: string;
}

const burnCurrencies: Item[] = [{ label: 'bLuna', value: 'bluna' }];
const getCurrencies: Item[] = [{ label: 'Luna', value: 'luna' }];

export function Swap() {
  // ---------------------------------------------
  // dependencies
  // ---------------------------------------------
  const connectedWallet = useConnectedWallet();

  const { fixedGas } = useConstants();

  const client = useApolloClient();

  const address = useContractAddress();

  const [swap, swapResult] = useOperation(swapOptions, {});

  // ---------------------------------------------
  // states
  // ---------------------------------------------
  const [burnAmount, setBurnAmount] = useState<bLuna>('' as bLuna);
  const [getAmount, setGetAmount] = useState<Luna>('' as Luna);

  const [resolveSimulation, simulation] = useResolveLast<
    SwapSimulation<uLuna, ubLuna> | undefined | null
  >(() => null);

  const [burnCurrency, setBurnCurrency] = useState<Item>(
    () => burnCurrencies[0],
  );
  const [getCurrency, setGetCurrency] = useState<Item>(() => getCurrencies[0]);

  // ---------------------------------------------
  // queries
  // ---------------------------------------------
  const bank = useBank();

  const {
    data: { terraswapPoolInfo: bLunaPrice },
  } = useTerraswapBLunaPrice();

  // ---------------------------------------------
  // logics
  // ---------------------------------------------
  const invalidTxFee = useMemo(
    () => !!connectedWallet && validateTxFee(bank, fixedGas),
    [bank, fixedGas, connectedWallet],
  );

  const invalidBurnAmount = useMemo(
    () => !!connectedWallet && validateBurnAmount(burnAmount, bank),
    [bank, burnAmount, connectedWallet],
  );

  // ---------------------------------------------
  // effects
  // ---------------------------------------------
  useEffect(() => {
    if (simulation?.getAmount) {
      setGetAmount(formatLunaInput(demicrofy(simulation.getAmount)));
    }
  }, [simulation?.getAmount]);

  useEffect(() => {
    if (simulation?.burnAmount) {
      setBurnAmount(formatLunaInput(demicrofy(simulation.burnAmount)));
    }
  }, [simulation?.burnAmount]);

  // ---------------------------------------------
  // callbacks
  // ---------------------------------------------
  const updateBurnCurrency = useCallback((nextBurnCurrencyValue: string) => {
    setBurnCurrency(
      burnCurrencies.find(({ value }) => nextBurnCurrencyValue === value) ??
        burnCurrencies[0],
    );
  }, []);

  const updateGetCurrency = useCallback((nextGetCurrencyValue: string) => {
    setGetCurrency(
      getCurrencies.find(({ value }) => nextGetCurrencyValue === value) ??
        getCurrencies[0],
    );
  }, []);

  const updateBurnAmount = useCallback(
    async (nextBurnAmount: string) => {
      if (nextBurnAmount.trim().length === 0) {
        setGetAmount('' as Luna);
        setBurnAmount('' as bLuna);

        resolveSimulation(null);
      } else if (isZero(nextBurnAmount)) {
        setGetAmount('' as Luna);
        setBurnAmount(nextBurnAmount as bLuna);

        resolveSimulation(null);
      } else {
        const burnAmount: bLuna = nextBurnAmount as bLuna;
        setBurnAmount(burnAmount);

        const amount = microfy(burnAmount).toString() as ubLuna;

        resolveSimulation(
          querySimulation(
            client,
            address,
            amount,
            address.terraswap.blunaLunaPair,
            {
              token: {
                contract_addr: address.cw20.bLuna,
              },
            },
          ).then(({ data: { simulation } }) =>
            simulation
              ? swapGetSimulation(
                  simulation as terraswap.SimulationResponse<uLuna>,
                  amount,
                  bank.tax,
                )
              : undefined,
          ),
        );
      }
    },
    [address, bank.tax, client, resolveSimulation],
  );

  const updateGetAmount = useCallback(
    (nextGetAmount: string) => {
      if (nextGetAmount.trim().length === 0) {
        setBurnAmount('' as bLuna);
        setGetAmount('' as Luna);

        resolveSimulation(null);
      } else if (isZero(nextGetAmount)) {
        setBurnAmount('' as bLuna);
        setGetAmount(nextGetAmount as Luna);

        resolveSimulation(null);
      } else {
        const getAmount: Luna = nextGetAmount as Luna;
        setGetAmount(getAmount);

        const amount = microfy(getAmount).toString() as uLuna;

        resolveSimulation(
          querySimulation(
            client,
            address,
            amount,
            address.terraswap.blunaLunaPair,
            {
              native_token: {
                denom: 'uluna' as Denom,
              },
            },
          ).then(({ data: { simulation } }) =>
            simulation
              ? swapBurnSimulation(
                  simulation as terraswap.SimulationResponse<uLuna>,
                  amount,
                  bank.tax,
                )
              : undefined,
          ),
        );
      }
    },
    [address, bank.tax, client, resolveSimulation],
  );

  const init = useCallback(() => {
    setGetAmount('' as Luna);
    setBurnAmount('' as bLuna);
  }, []);

  const proceed = useCallback(
    async (
      walletReady: WalletReady,
      burnAmount: bLuna,
      beliefPrice: Rate,
      maxSpread: Rate,
    ) => {
      const broadcasted = await swap({
        address: walletReady.walletAddress,
        amount: burnAmount,
        bAsset: burnCurrency.value,
        beliefPrice: formatExecuteMsgNumber(big(1).div(beliefPrice)),
        maxSpread,
      });

      if (!broadcasted) {
        init();
      }
    },
    [swap, burnCurrency.value, init],
  );

  // ---------------------------------------------
  // presentation
  // ---------------------------------------------
  if (
    swapResult?.status === 'in-progress' ||
    swapResult?.status === 'done' ||
    swapResult?.status === 'fault'
  ) {
    return <TransactionRenderer result={swapResult} onExit={init} />;
  }

  return (
    <>
      {!!invalidTxFee && <MessageBox>{invalidTxFee}</MessageBox>}

      {/* Burn (bAsset) */}
      <div className="burn-description">
        <p>I want to burn</p>
        <p />
      </div>

      <SelectAndTextInputContainer
        className="burn"
        gridColumns={[120, '1fr']}
        error={!!invalidBurnAmount}
        leftHelperText={invalidBurnAmount}
        rightHelperText={
          !!connectedWallet && (
            <span>
              Balance:{' '}
              <span
                style={{ textDecoration: 'underline', cursor: 'pointer' }}
                onClick={() =>
                  updateBurnAmount(
                    formatLunaInput(demicrofy(bank.userBalances.ubLuna)),
                  )
                }
              >
                {formatLuna(demicrofy(bank.userBalances.ubLuna))}{' '}
                {burnCurrency.label}
              </span>
            </span>
          )
        }
      >
        <MuiNativeSelect
          value={burnCurrency}
          onChange={({ target }) => updateBurnCurrency(target.value)}
          IconComponent={burnCurrencies.length < 2 ? BlankComponent : undefined}
          disabled={burnCurrencies.length < 2}
        >
          {burnCurrencies.map(({ label, value }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </MuiNativeSelect>
        <NumberMuiInput
          placeholder="0.00"
          error={!!invalidBurnAmount}
          value={burnAmount}
          maxIntegerPoinsts={LUNA_INPUT_MAXIMUM_INTEGER_POINTS}
          maxDecimalPoints={LUNA_INPUT_MAXIMUM_DECIMAL_POINTS}
          onChange={({ target }: ChangeEvent<HTMLInputElement>) =>
            updateBurnAmount(target.value)
          }
        />
      </SelectAndTextInputContainer>

      <IconLineSeparator />

      {/* Get (Asset) */}
      <div className="gett-description">
        <p>and get</p>
        <p />
      </div>

      <SelectAndTextInputContainer
        className="gett"
        gridColumns={[120, '1fr']}
        error={!!invalidBurnAmount}
      >
        <MuiNativeSelect
          value={getCurrency}
          onChange={({ target }) => updateGetCurrency(target.value)}
          IconComponent={getCurrencies.length < 2 ? BlankComponent : undefined}
          disabled={getCurrencies.length < 2}
        >
          {getCurrencies.map(({ label, value }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </MuiNativeSelect>
        <NumberMuiInput
          placeholder="0.00"
          error={!!invalidBurnAmount}
          value={getAmount}
          maxIntegerPoinsts={LUNA_INPUT_MAXIMUM_INTEGER_POINTS}
          maxDecimalPoints={LUNA_INPUT_MAXIMUM_DECIMAL_POINTS}
          onChange={({ target }: ChangeEvent<HTMLInputElement>) =>
            updateGetAmount(target.value)
          }
        />
      </SelectAndTextInputContainer>

      {burnAmount.length > 0 && bLunaPrice && simulation && (
        <TxFeeList className="receipt">
          <SwapListItem
            label="Price"
            currencyA="Luna"
            currencyB="bLuna"
            exchangeRateAB={simulation.beliefPrice}
            initialDirection="a/b"
            formatExchangeRate={(price) =>
              formatFluidDecimalPoints(
                price,
                LUNA_INPUT_MAXIMUM_DECIMAL_POINTS,
                { delimiter: true },
              )
            }
          />
          <TxFeeListItem label="Minimum Received">
            {formatLuna(demicrofy(simulation.minimumReceived))} Luna
          </TxFeeListItem>
          <TxFeeListItem label="Trading Fee">
            {formatLuna(demicrofy(simulation.swapFee))} Luna
          </TxFeeListItem>
          <TxFeeListItem label="Tx Fee">
            {formatUST(demicrofy(fixedGas))} UST
          </TxFeeListItem>
        </TxFeeList>
      )}

      {/* Submit */}
      <ActionButton
        className="submit"
        disabled={
          !connectedWallet ||
          burnAmount.length === 0 ||
          big(burnAmount).lte(0) ||
          !!invalidTxFee ||
          !!invalidBurnAmount ||
          big(simulation?.swapFee ?? 0).lte(0)
        }
        onClick={() =>
          connectedWallet &&
          proceed(
            connectedWallet,
            burnAmount,
            simulation!.beliefPrice,
            simulation!.maxSpread,
          )
        }
      >
        Burn
      </ActionButton>
    </>
  );
}

function BlankComponent() {
  return <div />;
}
