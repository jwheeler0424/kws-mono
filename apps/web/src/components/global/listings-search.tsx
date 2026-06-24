import type { CheckboxRootState } from '@base-ui/react/checkbox';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { Search, X } from 'lucide-react';
import React from 'react';

import type { TPropertyCard } from '@/types/property';

import { Button } from '@/components/global/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Combobox, ComboboxContent, ComboboxInputDebounced } from '@/components/ui/combobox';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import {
  DEFAULT_POSITION,
  FILTER_LIMITS,
  PROPERTY_IMAGE_PLACEHOLDER_URL,
} from '@/config/constants/properties';
import { cn, numberFormatInternational } from '@/lib/utils';
import { getAddressStreet, numberFormat } from '@/lib/utils/properties';
import {
  applySearchFiltersMutationOptions,
  resetSearchFiltersMutationOptions,
  searchListingsOptions,
} from '@/packages/mls/search.options';
import { Route as ListingsRoute } from '@/routes/_frontend/listings/_listings.index';
import { useMapActions, useMapStore } from '@/stores/map.store';
import { toCanonicalListingsSearch, toListingsSearchUrl } from '@/types/search';

import { toast } from '../ui/toast';
import { ScrollArea } from './listings-search-scroll-area';

export default function ListingsSearch() {
  const search = ListingsRoute.useSearch();
  const navigate = useNavigate();
  const [filterOpen, setFilterOpen] = React.useState<boolean>(false);
  const { min: priceMin, max: priceMax } = search.price ?? { min: null, max: null };
  const { min: sqFtMin, max: sqFtMax } = search.sqFt ?? { min: null, max: null };
  const { min: bedroomsMin, max: bedroomsMax } = search.bedrooms ?? {
    min: null,
    max: null,
  };
  const { min: bathroomsMin, max: bathroomsMax } = search.bathrooms ?? {
    min: null,
    max: null,
  };
  const limit = search.limit;
  const query = search.query;
  const useMapBounds = search.useMapBounds;
  const queryClient = useQueryClient();

  const mapBounds = useMapStore((state) => state.bounds);
  const { setBounds: setMapBounds, setZoom: setMapZoom } = useMapActions();

  const [searchResults, setSearchResults] = React.useState<TPropertyCard[]>([]);
  const [searchQueryLocal, setSearchQueryLocal] = React.useState<string | undefined>(
    query ?? undefined,
  );
  const [priceValues, setPriceValuesLocal] = React.useState<Array<number | null>>([
    priceMin,
    priceMax,
  ]);
  const [sqFtValues, setSqFtValuesLocal] = React.useState<Array<number | null>>([sqFtMin, sqFtMax]);
  const [bedroomValues, setBedroomValuesLocal] = React.useState<Array<number | null>>([
    bedroomsMin,
    bedroomsMax,
  ]);
  const [bathroomValues, setBathroomValuesLocal] = React.useState<Array<number | null>>([
    bathroomsMin,
    bathroomsMax,
  ]);
  const [useMapBoundsLocal, setUseBoundsLocal] = React.useState<boolean | null | undefined>(
    useMapBounds,
  );
  const [isSearchLoading, setIsSearchLoading] = React.useState(false);
  const latestSearchRequestRef = React.useRef(0);

  const applyFiltersMutation = useMutation(applySearchFiltersMutationOptions(queryClient));
  const resetFiltersMutation = useMutation(resetSearchFiltersMutationOptions(queryClient));

  const { minPrice, maxPrice, minSqFt, maxSqFt, minBedroom, maxBedroom, minBathroom, maxBathroom } =
    FILTER_LIMITS;

  const buildPayloadFromLocal = React.useCallback(
    (queryValue: string | undefined) => ({
      query: queryValue,
      limit: limit,
      price: { min: priceValues[0], max: priceValues[1] },
      sqFt: { min: sqFtValues[0], max: sqFtValues[1] },
      bedrooms: { min: bedroomValues[0], max: bedroomValues[1] },
      bathrooms: { min: bathroomValues[0], max: bathroomValues[1] },
      useMapBounds: Boolean(useMapBoundsLocal),
    }),
    [bathroomValues, bedroomValues, limit, priceValues, sqFtValues, useMapBoundsLocal],
  );

  const buildRouteSearchFromLocal = React.useCallback(
    (queryValue: string | undefined) => ({
      query: queryValue && queryValue.length >= 3 ? queryValue : null,
      limit: limit ?? null,
      price: { min: priceValues[0], max: priceValues[1] },
      sqFt: { min: sqFtValues[0], max: sqFtValues[1] },
      bedrooms: { min: bedroomValues[0], max: bedroomValues[1] },
      bathrooms: { min: bathroomValues[0], max: bathroomValues[1] },
      useMapBounds: Boolean(useMapBoundsLocal),
      bounds: Boolean(useMapBoundsLocal) && mapBounds ? mapBounds : null,
      sortBy: null,
      proximity: null,
    }),
    [bathroomValues, bedroomValues, limit, mapBounds, priceValues, sqFtValues, useMapBoundsLocal],
  );

  const handleClearSearchQuery = (_e: React.MouseEvent) => {
    applyFiltersMutation.mutate({ query: undefined });
    setSearchQueryLocal(undefined);
    setSearchResults([]);
    setIsSearchLoading(false);

    void navigate({
      to: '/listings',
      search: (prev) =>
        toListingsSearchUrl(
          toCanonicalListingsSearch({
            query: null,
            limit: prev.limit ?? null,
            price: prev.price ?? null,
            sqFt: prev.sqFt ?? null,
            bedrooms: prev.bedrooms ?? null,
            bathrooms: prev.bathrooms ?? null,
            useMapBounds: prev.useMapBounds ?? null,
            bounds: prev.bounds ?? null,
            sortBy: prev.sortBy ?? null,
            proximity: prev.proximity ?? null,
          }),
        ),
    });
  };

  const handleSetBounds = (checked: CheckboxRootState['checked']) => {
    setUseBoundsLocal(checked === true);
  };

  const handlePriceValueChange = (newValues: number | readonly number[]) => {
    const values = Array.isArray(newValues) ? newValues : [newValues];
    setPriceValuesLocal([
      values[0] <= minPrice ? null : values[0],
      values[1] >= maxPrice ? null : values[1],
    ]);
  };
  const handleSqFtValueChange = (newValues: number | readonly number[]) => {
    const values = Array.isArray(newValues) ? newValues : [newValues];
    setSqFtValuesLocal([
      values[0] <= minSqFt ? null : values[0],
      values[1] >= maxSqFt ? null : values[1],
    ]);
  };
  const handleBedroomValueChange = (newValues: number | readonly number[]) => {
    const values = Array.isArray(newValues) ? newValues : [newValues];
    setBedroomValuesLocal([
      values[0] <= minBedroom ? null : values[0],
      values[1] >= maxBedroom ? null : values[1],
    ]);
  };
  const handleBathroomValueChange = (newValues: number | readonly number[]) => {
    const values = Array.isArray(newValues) ? newValues : [newValues];
    setBathroomValuesLocal([
      values[0] <= minBathroom ? null : values[0],
      values[1] >= maxBathroom ? null : values[1],
    ]);
  };

  const handleDebouncedQueryChange = React.useCallback(
    async (queryValue?: string) => {
      const keyword = queryValue?.trim();

      if (!keyword || keyword.length < 3) {
        latestSearchRequestRef.current += 1;
        setIsSearchLoading(false);
        setSearchResults([]);
        return;
      }

      const requestId = latestSearchRequestRef.current + 1;
      latestSearchRequestRef.current = requestId;
      setIsSearchLoading(true);

      const filters = {
        keywords: keyword,
        limit: 25,
        minPrice: priceValues[0] ?? undefined,
        maxPrice: priceValues[1] ?? undefined,
        minSqFt: sqFtValues[0] ?? undefined,
        maxSqFt: sqFtValues[1] ?? undefined,
        minBeds: bedroomValues[0] ?? undefined,
        maxBeds: bedroomValues[1] ?? undefined,
        minBaths: bathroomValues[0] ?? undefined,
        maxBaths: bathroomValues[1] ?? undefined,
        bbox:
          Boolean(useMapBoundsLocal) && mapBounds
            ? ([
                mapBounds.southWest.lng,
                mapBounds.southWest.lat,
                mapBounds.northEast.lng,
                mapBounds.northEast.lat,
              ] as [number, number, number, number])
            : undefined,
      };

      try {
        const response = await queryClient.ensureQueryData(searchListingsOptions(filters));

        if (latestSearchRequestRef.current !== requestId) {
          return;
        }

        setSearchResults(response);
      } catch {
        if (latestSearchRequestRef.current !== requestId) {
          return;
        }

        setSearchResults([]);
      } finally {
        if (latestSearchRequestRef.current === requestId) {
          setIsSearchLoading(false);
        }
      }
    },
    [
      bathroomValues,
      bedroomValues,
      mapBounds,
      priceValues,
      queryClient,
      sqFtValues,
      useMapBoundsLocal,
    ],
  );

  const resetSearchFilters = (_e: React.MouseEvent<HTMLButtonElement>) => {
    resetFiltersMutation.mutate();
    setPriceValuesLocal([null, null]);
    setSqFtValuesLocal([null, null]);
    setBedroomValuesLocal([null, null]);
    setBathroomValuesLocal([null, null]);
    setUseBoundsLocal(false);
  };

  const handleInputSearch = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && e.currentTarget.value.length >= 3) {
        const queryValue = e.currentTarget.value;
        applyFiltersMutation.mutate(buildPayloadFromLocal(queryValue));
        const search = toListingsSearchUrl(buildRouteSearchFromLocal(queryValue));
        setIsSearchLoading(false);
        setSearchResults([]);
        void navigate({ to: '/listings', search });
        return;
      }
      if (e.currentTarget.value.length < 3) {
        setIsSearchLoading(false);
        setSearchResults([]);
      }
    },
    [applyFiltersMutation, buildPayloadFromLocal, buildRouteSearchFromLocal, navigate],
  );

  React.useEffect(() => {
    setSearchQueryLocal(search.query ?? undefined);
    setPriceValuesLocal([search.price?.min ?? null, search.price?.max ?? null]);
    setSqFtValuesLocal([search.sqFt?.min ?? null, search.sqFt?.max ?? null]);
    setBedroomValuesLocal([search.bedrooms?.min ?? null, search.bedrooms?.max ?? null]);
    setBathroomValuesLocal([search.bathrooms?.min ?? null, search.bathrooms?.max ?? null]);
    setUseBoundsLocal(Boolean(search.useMapBounds));
    setIsSearchLoading(false);
  }, [
    search.bathrooms?.max,
    search.bathrooms?.min,
    search.bedrooms?.max,
    search.bedrooms?.min,
    search.price?.max,
    search.price?.min,
    search.query,
    search.sqFt?.max,
    search.sqFt?.min,
    search.useMapBounds,
  ]);

  const trimmedSearchQuery = searchQueryLocal?.trim() ?? '';
  const hasSearchKeyword = trimmedSearchQuery.length >= 3;
  const hasSearchResults = searchResults.length > 0;
  const showSearchSurface = hasSearchKeyword || isSearchLoading;
  const showSearchEmptyState = showSearchSurface && !isSearchLoading && !hasSearchResults;

  const handleAdvancedFilterSearch = React.useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();

      const queryValue =
        searchQueryLocal && searchQueryLocal.length >= 3 ? searchQueryLocal : undefined;

      applyFiltersMutation.mutate(buildPayloadFromLocal(queryValue));

      if (!useMapBoundsLocal) {
        setMapBounds(null);
        setMapZoom(DEFAULT_POSITION.zoom);
      }
      const search = toListingsSearchUrl(buildRouteSearchFromLocal(queryValue));
      setSearchResults([]);
      void navigate({ to: '/listings', search });
      setFilterOpen(false);
    },
    [
      applyFiltersMutation,
      buildPayloadFromLocal,
      buildRouteSearchFromLocal,
      navigate,
      searchQueryLocal,
      setMapBounds,
      setMapZoom,
      useMapBoundsLocal,
    ],
  );

  // INDIVIDUAL SEARCH FILTER HANDLERS
  const handleInputMinPrice = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const value = input.replace(/[^\d.]/g, '');
    if (value === '') {
      setPriceValuesLocal([null, priceMax]);
      return;
    }
    const newValue = !Number.isNaN(value) ? parseInt(value) : null;
    if (newValue === null) {
      setPriceValuesLocal([null, priceMax]);
      return;
    }
    setPriceValuesLocal([newValue, priceMax]);
  };

  const handleInputMinPriceBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const value = input.replace(/[^\d.]/g, '');
    if (value === '') {
      setPriceValuesLocal([null, priceMax]);
      return;
    }
    const newValue = !Number.isNaN(value) ? parseInt(value) : null;
    if (newValue === null || newValue < minPrice) {
      setPriceValuesLocal([null, priceMax]);
      toast.error(
        `Please enter a valid minimum price between ${numberFormatInternational(minPrice, {
          currency: 'USD',
          style: 'currency',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })} and ${numberFormatInternational(maxPrice, {
          currency: 'USD',
          style: 'currency',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })}.`,
      );
      return;
    }
    if (maxPrice === null && newValue > maxPrice) {
      setPriceValuesLocal([null, priceMax]);
      toast.error(
        `Please enter a valid minimum price between ${numberFormatInternational(minPrice, {
          currency: 'USD',
          style: 'currency',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })} and ${numberFormatInternational(maxPrice, {
          currency: 'USD',
          style: 'currency',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })}.`,
      );
      return;
    }
    if (priceMax !== null && newValue >= priceMax) {
      setPriceValuesLocal([priceMax, priceMax]);
      return;
    }
    setPriceValuesLocal([newValue, priceMax]);
  };

  const handleInputMaxPrice = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const value = input.replace(/[^\d.]/g, '');
    if (value === '') {
      setPriceValuesLocal([priceMin, null]);
      return;
    }
    const newValue = !Number.isNaN(value) ? parseInt(value) : null;
    if (newValue === null) {
      setPriceValuesLocal([priceMin, null]);
      return;
    }
    setPriceValuesLocal([priceMin, newValue]);
  };

  const handleInputMaxPriceBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const value = input.replace(/[^\d.]/g, '');
    if (value === '') {
      setPriceValuesLocal([priceMin, null]);
      return;
    }
    const newValue = !Number.isNaN(value) ? parseInt(value) : null;
    if (newValue === null || newValue > maxPrice) {
      setPriceValuesLocal([priceMin, null]);
      toast.error(
        `Please enter a valid minimum price between ${numberFormatInternational(minPrice, {
          currency: 'USD',
          style: 'currency',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })} and ${numberFormatInternational(maxPrice, {
          currency: 'USD',
          style: 'currency',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })}.`,
      );
      return;
    }
    if (priceMin === null && newValue < minPrice) {
      setPriceValuesLocal([priceMin, null]);
      toast.error(
        `Please enter a valid minimum price between ${numberFormatInternational(minPrice, {
          currency: 'USD',
          style: 'currency',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })} and ${numberFormatInternational(maxPrice, {
          currency: 'USD',
          style: 'currency',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })}.`,
      );
      return;
    }
    if (priceMin !== null && newValue <= priceMin) {
      setPriceValuesLocal([priceMin, priceMin]);
      return;
    }
    setPriceValuesLocal([priceMin, newValue]);
  };

  const handleInputMinSqFt = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const value = input.replace(/\D/g, '');
    if (value === '') {
      setSqFtValuesLocal([null, sqFtMax]);
      return;
    }
    const newValue = !Number.isNaN(value) ? parseInt(value) : null;
    if (newValue === null) {
      setSqFtValuesLocal([null, sqFtMax]);
      return;
    }
    setSqFtValuesLocal([newValue, sqFtMax]);
  };

  const handleInputMinSqFtBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const value = input.replace(/\D/g, '');
    if (value === '') {
      setSqFtValuesLocal([null, sqFtMax]);
      return;
    }
    const newValue = !Number.isNaN(value) ? parseInt(value) : null;
    if (newValue === null || newValue < minSqFt) {
      setSqFtValuesLocal([null, sqFtMax]);
      toast.error(
        `Please enter a valid minimum square footage between ${numberFormatInternational(minSqFt)} and ${numberFormatInternational(maxSqFt)}.`,
      );
      return;
    }
    if (sqFtMax === null && newValue > maxSqFt) {
      setSqFtValuesLocal([null, sqFtMax]);
      toast.error(
        `Please enter a valid minimum square footage between ${numberFormatInternational(minSqFt)} and ${numberFormatInternational(maxSqFt)}.`,
      );
      return;
    }
    if (sqFtMax !== null && newValue >= sqFtMax) {
      setSqFtValuesLocal([sqFtMax, sqFtMax]);
      return;
    }
    setSqFtValuesLocal([newValue, sqFtMax]);
  };

  const handleInputMaxSqFt = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const value = input.replace(/\D/g, '');
    if (value === '') {
      setSqFtValuesLocal([sqFtMin, null]);
      return;
    }
    const newValue = !Number.isNaN(value) ? parseInt(value) : null;
    if (newValue === null) {
      setSqFtValuesLocal([sqFtMin, null]);
      return;
    }
    setSqFtValuesLocal([sqFtMin, newValue]);
  };

  const handleInputMaxSqFtBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const value = input.replace(/\D/g, '');
    if (value === '') {
      setSqFtValuesLocal([sqFtMin, null]);
      return;
    }
    const newValue = !Number.isNaN(value) ? parseInt(value) : null;
    if (newValue === null || newValue > maxSqFt) {
      setSqFtValuesLocal([sqFtMin, null]);
      toast.error(
        `Please enter a valid minimum square footage between ${numberFormatInternational(minSqFt)} and ${numberFormatInternational(maxSqFt)}.`,
      );
      return;
    }
    if (sqFtMin === null && newValue < minSqFt) {
      setSqFtValuesLocal([sqFtMin, null]);
      toast.error(
        `Please enter a valid minimum square footage between ${numberFormatInternational(minSqFt)} and ${numberFormatInternational(maxSqFt)}.`,
      );
      return;
    }
    if (sqFtMin !== null && newValue <= sqFtMin) {
      setSqFtValuesLocal([sqFtMin, sqFtMin]);
      return;
    }
    setSqFtValuesLocal([sqFtMin, newValue]);
  };

  const handleInputMinBedroom = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const value = input.replace(/\D/g, '');
    if (value === '') {
      setBedroomValuesLocal([null, bedroomsMax]);
      return;
    }
    const newValue = !Number.isNaN(value) ? parseInt(value) : null;
    if (newValue === null) {
      setBedroomValuesLocal([null, bedroomsMax]);
      return;
    }
    setBedroomValuesLocal([newValue, bedroomsMax]);
  };

  const handleInputMinBedroomBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const value = input.replace(/\D/g, '');
    if (value === '') {
      setBedroomValuesLocal([null, bedroomsMax]);
      return;
    }
    const newValue = !Number.isNaN(value) ? parseInt(value) : null;
    if (newValue === null || newValue < minBedroom) {
      setBedroomValuesLocal([null, bedroomsMax]);
      toast.error(
        `Please enter a valid minimum bedroom count between ${numberFormatInternational(minBedroom + 1)} and ${numberFormatInternational(maxBedroom - 1)}.`,
      );
      return;
    }
    if (bedroomsMax === null && newValue > maxBedroom) {
      setBedroomValuesLocal([null, bedroomsMax]);
      toast.error(
        `Please enter a valid minimum bedroom count between ${numberFormatInternational(minBedroom + 1)} and ${numberFormatInternational(maxBedroom - 1)}.`,
      );
      return;
    }
    if (bedroomsMax !== null && newValue >= bedroomsMax) {
      setBedroomValuesLocal([bedroomsMax, bedroomsMax]);
      return;
    }
    setBedroomValuesLocal([newValue, bedroomsMax]);
  };

  const handleInputMaxBedroom = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const value = input.replace(/\D/g, '');
    if (value === '') {
      setBedroomValuesLocal([bedroomsMin, null]);
      return;
    }
    const newValue = !Number.isNaN(value) ? parseInt(value) : null;
    if (newValue === null) {
      setBedroomValuesLocal([bedroomsMin, null]);
      return;
    }
    setBedroomValuesLocal([bedroomsMin, newValue]);
  };

  const handleInputMaxBedroomBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const value = input.replace(/\D/g, '');
    if (value === '') {
      setBedroomValuesLocal([bedroomsMin, null]);
      return;
    }
    const newValue = !Number.isNaN(value) ? parseInt(value) : null;
    if (newValue === null || newValue > maxBedroom) {
      setBedroomValuesLocal([bedroomsMin, null]);
      toast.error(
        `Please enter a valid minimum bedroom count between ${numberFormatInternational(minBedroom + 1)} and ${numberFormatInternational(maxBedroom - 1)}.`,
      );
      return;
    }
    if (bedroomsMin === null && newValue < minBedroom) {
      setBedroomValuesLocal([bedroomsMin, null]);
      toast.error(
        `Please enter a valid minimum bedroom count between ${numberFormatInternational(minBedroom + 1)} and ${numberFormatInternational(maxBedroom - 1)}.`,
      );
      return;
    }
    if (bedroomsMin !== null && newValue <= bedroomsMin) {
      setBedroomValuesLocal([bedroomsMin, bedroomsMin]);
      return;
    }
    setBedroomValuesLocal([bedroomsMin, newValue]);
  };

  const handleInputMinBathroom = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const value = input.replace(/\D/g, '');
    if (value === '') {
      setBathroomValuesLocal([null, bathroomsMax]);
      return;
    }
    const newValue = !Number.isNaN(value) ? parseInt(value) : null;
    if (newValue === null) {
      setBathroomValuesLocal([null, bathroomsMax]);
      return;
    }
    setBathroomValuesLocal([newValue, bathroomsMax]);
  };

  const handleInputMinBathroomBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const value = input.replace(/\D/g, '');
    if (value === '') {
      setBathroomValuesLocal([null, bathroomsMax]);
      return;
    }
    const newValue = !Number.isNaN(value) ? parseInt(value) : null;
    if (newValue === null || newValue < minBathroom) {
      setBathroomValuesLocal([null, bathroomsMax]);
      toast.error(
        `Please enter a valid minimum bathroom count between ${numberFormatInternational(minBathroom + 1)} and ${numberFormatInternational(maxBathroom - 1)}.`,
      );
      return;
    }
    if (bathroomsMax === null && newValue > maxBathroom) {
      setBathroomValuesLocal([null, bathroomsMax]);
      toast.error(
        `Please enter a valid minimum bathroom count between ${numberFormatInternational(minBathroom + 1)} and ${numberFormatInternational(maxBathroom - 1)}.`,
      );
      return;
    }
    if (bathroomsMax !== null && newValue >= bathroomsMax) {
      setBathroomValuesLocal([bathroomsMax, bathroomsMax]);
      return;
    }
    setBathroomValuesLocal([newValue, bathroomsMax]);
  };

  const handleInputMaxBathroom = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const value = input.replace(/\D/g, '');
    if (value === '') {
      setBathroomValuesLocal([bathroomsMin, null]);
      return;
    }
    const newValue = !Number.isNaN(value) ? parseInt(value) : null;
    if (newValue === null) {
      setBathroomValuesLocal([bathroomsMin, null]);
      return;
    }
    setBathroomValuesLocal([bathroomsMin, newValue]);
  };

  const handleInputMaxBathroomBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const value = input.replace(/\D/g, '');
    if (value === '') {
      setBathroomValuesLocal([bathroomsMin, null]);
      return;
    }
    const newValue = !Number.isNaN(value) ? parseInt(value) : null;
    if (newValue === null || newValue > maxBathroom) {
      setBathroomValuesLocal([bathroomsMin, null]);
      toast.error(
        `Please enter a valid minimum bathroom count between ${numberFormatInternational(minBathroom + 1)} and ${numberFormatInternational(maxBathroom - 1)}.`,
      );
      return;
    }
    if (bathroomsMin === null && newValue < minBathroom) {
      setBathroomValuesLocal([bathroomsMin, null]);
      toast.error(
        `Please enter a valid minimum bathroom count between ${numberFormatInternational(minBathroom + 1)} and ${numberFormatInternational(maxBathroom - 1)}.`,
      );
      return;
    }
    if (bathroomsMin !== null && newValue <= bathroomsMin) {
      setBathroomValuesLocal([bathroomsMin, bathroomsMin]);
      return;
    }
    setBathroomValuesLocal([bathroomsMin, newValue]);
  };

  return (
    <Sheet open={filterOpen} onOpenChange={setFilterOpen} modal>
      <div className='absolute top-10 left-1/2 z-30 flex w-11/12 max-w-lg -translate-x-1/2 flex-col gap-4 px-4'>
        <Combobox open={showSearchSurface}>
          <div className='w-full rounded-[1.25rem] focus-within:ring-2 focus-within:ring-polaris-primary focus-within:ring-offset-2'>
            <ComboboxInputDebounced
              placeholder='Search property listings...'
              value={searchQueryLocal ?? ''}
              onValueChange={(value) => setSearchQueryLocal(value)}
              onDebouncedChange={handleDebouncedQueryChange}
              waitMs={300}
              onKeyDown={handleInputSearch}
              onDebounceStart={() => {
                if ((searchQueryLocal?.trim().length ?? 0) >= 3) {
                  setIsSearchLoading(true);
                }
              }}
              showTrigger={false}
              showClear={false}
              startAddon={<Search className='text-icon size-5' />}
              endAddon={
                searchQueryLocal ? (
                  <Button className='size-10 shrink-0 p-1' onClick={handleClearSearchQuery}>
                    <X className='size-5 text-polaris-primary drop-shadow transition-colors duration-200 ease-linear hover:text-polaris-primary-600' />
                  </Button>
                ) : null
              }
              className={cn(
                'h-10 w-full rounded-[1.25rem] border-polaris-primary/40 bg-white shadow-none has-[[data-slot=input-group-control]:focus-visible]:border-polaris-primary/40 has-[[data-slot=input-group-control]:focus-visible]:ring-0',
                showSearchSurface && 'rounded-b-none border-b-0',
              )}
              inputClassName={cn(
                'placeholder:text-icon-200 h-10 rounded-[1.25rem] bg-transparent px-0 py-0.5 text-gray-900 placeholder:italic focus-visible:border-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none',
                showSearchSurface && 'rounded-b-none',
              )}
            />
            <ComboboxContent
              inline
              className={cn(
                'min-h-8 max-w-full border-polaris-primary/40 bg-white p-0',
                !showSearchSurface && 'hidden',
              )}>
              {isSearchLoading ? (
                <div className='flex min-h-28 w-full items-center justify-center px-4 py-6 text-sm text-muted-foreground'>
                  Searching listings for "{trimmedSearchQuery}"...
                </div>
              ) : null}
              {showSearchEmptyState ? (
                <Empty className='rounded-none border-0 px-4 py-8'>
                  <EmptyHeader>
                    <EmptyMedia variant='icon'>
                      <Search className='size-4' />
                    </EmptyMedia>
                    <EmptyTitle>No listings found</EmptyTitle>
                    <EmptyDescription>
                      No properties matched "{trimmedSearchQuery}". Try a broader phrase or reset
                      your filters.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : null}
              {hasSearchResults ? (
                <ScrollArea
                  className={cn(
                    'w-full overscroll-contain px-1.5 py-2 [&>div>div]:max-w-full',
                    searchResults.length > 3 ? 'h-72 lg:h-96' : 'h-auto',
                  )}>
                  <ItemGroup className='gap-1'>
                    {searchResults.map((result) => (
                      <Link
                        key={result.listingKey}
                        className='group m-0 flex w-full items-start gap-1 rounded-none text-left text-black no-underline hover:no-underline'
                        to={`/listings/$listingKey`}
                        preload='intent'
                        params={{
                          listingKey: result.listingKey,
                        }}>
                        <Item className='items-center px-2.5 group-hover:bg-muted'>
                          <ItemMedia className='-mt-0.5 aspect-video h-10 w-fit overflow-clip rounded-sm bg-muted shadow transition-all duration-200 ease-linear group-hover:ring-2 group-hover:ring-polaris-primary group-hover:ring-offset-2 group-hover:ring-offset-white'>
                            <img
                              src={
                                result.primaryPhotoThumbnailUrl ||
                                result.primaryPhotoPreviewUrl ||
                                result.primaryPhotoFullUrl ||
                                result.primaryPhotoUrl ||
                                PROPERTY_IMAGE_PLACEHOLDER_URL
                              }
                              alt={result.unparsedAddress ?? 'Property image'}
                              className='object-cover object-center'
                            />
                          </ItemMedia>
                          <ItemContent className='h-10 justify-center py-0'>
                            <ItemTitle className='line-clamp-1 w-full truncate text-sm font-semibold transition-colors duration-200 ease-linear group-hover:text-polaris-primary'>
                              <span className='block w-full truncate'>
                                {getAddressStreet(result)}
                              </span>
                            </ItemTitle>
                            <ItemDescription className='text-xs font-normal'>
                              <span>
                                {result.internetAutomatedValuationDisplayYN === false
                                  ? 'Unavailable'
                                  : numberFormat({ value: parseInt(result.listPrice ?? '0') })}
                              </span>
                              <span className='hidden @sm:inline'>
                                {' '}
                                | {result.propertySubType ?? result.propertyType}
                              </span>
                              <span>
                                {' '}
                                | {result.city}, {result.stateOrProvince}
                              </span>
                            </ItemDescription>
                          </ItemContent>
                        </Item>
                      </Link>
                    ))}
                  </ItemGroup>
                </ScrollArea>
              ) : null}
            </ComboboxContent>
          </div>
        </Combobox>
        <div className='flex w-full items-center justify-end'>
          <SheetTrigger
            render={
              <Button
                variant={'solidPrimary'}
                size={'md'}
                className='font-admin rounded-full text-xs font-medium'>
                Advanced Filter
              </Button>
            }
          />
        </div>
      </div>
      <SheetContent className='overflow-y-auto border-none bg-white' side={'right'}>
        <SheetHeader className='space-y-1'>
          <SheetTitle className='-mt-1 text-2xl leading-1 font-normal'>Property Filters</SheetTitle>
          <SheetDescription className='text-xs!'>
            {`Adjust the filters to help find the perfect property for you.`}
          </SheetDescription>
        </SheetHeader>
        <div className='flex w-full items-center justify-start gap-2 px-4'>
          <Checkbox
            id={'map-restrict'}
            className={cn('size-5')}
            checked={!!useMapBoundsLocal}
            onCheckedChange={handleSetBounds}
          />
          <Label
            htmlFor={'map-restrict'}
            className='cursor-pointer text-left text-sm! font-semibold! text-gray-900!'>
            Restrict properties to map view
          </Label>
        </div>
        <div className='flex flex-col gap-6 px-4 py-2'>
          <div className='flex flex-col items-center gap-4'>
            <Label className='w-full text-sm! font-semibold! text-gray-900!'>Price range</Label>
            <Slider
              value={[priceValues[0] ?? minPrice, priceValues[1] ?? maxPrice]}
              max={maxPrice}
              min={minPrice}
              step={1000}
              onValueChange={handlePriceValueChange}
              className={cn('col-span-3 w-full text-gray-900!')}
            />
            <div className='flex w-full items-center justify-between'>
              <div className='flex flex-col gap-1'>
                <Label
                  htmlFor='minPrice'
                  className='text-left text-[11px]! font-semibold! text-gray-900!'>
                  Min Price
                </Label>
                <Input
                  value={
                    priceValues[0] === null
                      ? ''
                      : numberFormatInternational(priceValues[0], {
                          currency: 'USD',
                          style: 'decimal',
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })
                  }
                  placeholder='Any'
                  id='minPrice'
                  className='w-28'
                  onChange={handleInputMinPrice}
                  onBlur={handleInputMinPriceBlur}
                />
              </div>
              <div className='flex flex-col gap-1'>
                <Label
                  htmlFor='maxPrice'
                  className='text-left text-[11px]! font-semibold! text-gray-900!'>
                  Max Price
                </Label>
                <Input
                  value={
                    priceValues[1] === null
                      ? ''
                      : numberFormatInternational(priceValues[1], {
                          currency: 'USD',
                          style: 'decimal',
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })
                  }
                  placeholder='Any'
                  id='maxPrice'
                  className='w-28'
                  onChange={handleInputMaxPrice}
                  onBlur={handleInputMaxPriceBlur}
                />
              </div>
            </div>
          </div>
          <div className='flex flex-col items-center gap-4'>
            <Label className='w-full text-sm! font-semibold! text-gray-900!'>Square feet</Label>
            <Slider
              value={[sqFtValues[0] ?? minSqFt, sqFtValues[1] ?? maxSqFt]}
              max={maxSqFt}
              min={minSqFt}
              step={100}
              onValueChange={handleSqFtValueChange}
              className={cn('col-span-3 w-full')}
            />
            <div className='flex w-full items-center justify-between'>
              <div className='flex flex-col gap-1'>
                <Label
                  htmlFor='minSqFt'
                  className='text-left text-[11px]! font-semibold! text-gray-900!'>
                  Min Sq Ft
                </Label>
                <Input
                  value={sqFtValues[0] === null ? '' : numberFormatInternational(sqFtValues[0])}
                  placeholder='Any'
                  id='minSqFt'
                  className='w-28'
                  onChange={handleInputMinSqFt}
                  onBlur={handleInputMinSqFtBlur}
                />
              </div>
              <div className='flex flex-col gap-1'>
                <Label
                  htmlFor='maxSqFt'
                  className='text-left text-[11px]! font-semibold! text-gray-900!'>
                  Max Sq Ft
                </Label>
                <Input
                  value={sqFtValues[1] === null ? '' : numberFormatInternational(sqFtValues[1])}
                  placeholder='Any'
                  id='maxSqFt'
                  className='w-28'
                  onChange={handleInputMaxSqFt}
                  onBlur={handleInputMaxSqFtBlur}
                />
              </div>
            </div>
          </div>
          <div className='flex flex-col items-center gap-4'>
            <Label className='w-full text-left! text-sm! font-semibold! text-gray-900!'>
              Bedrooms
            </Label>
            <Slider
              value={[bedroomValues[0] ?? minBedroom, bedroomValues[1] ?? maxBedroom]}
              max={maxBedroom}
              min={minBedroom}
              step={1}
              onValueChange={handleBedroomValueChange}
              className={cn('col-span-3 w-full')}
            />
            <div className='flex w-full items-center justify-between'>
              <div className='flex flex-col gap-1'>
                <Label
                  htmlFor='minBedrooms'
                  className='text-left text-[11px]! font-semibold! text-gray-900!'>
                  Min Bedrooms
                </Label>
                <Input
                  value={
                    bedroomValues[0] === null ? '' : numberFormatInternational(bedroomValues[0])
                  }
                  placeholder='Any'
                  id='minBedrooms'
                  className='w-28'
                  onChange={handleInputMinBedroom}
                  onBlur={handleInputMinBedroomBlur}
                />
              </div>
              <div className='flex flex-col gap-1'>
                <Label
                  htmlFor='maxBedrooms'
                  className='text-left text-[11px]! font-semibold! text-gray-900!'>
                  Max Bedrooms
                </Label>
                <Input
                  value={
                    bedroomValues[1] === null ? '' : numberFormatInternational(bedroomValues[1])
                  }
                  placeholder='Any'
                  id='maxBedrooms'
                  className='w-28'
                  onChange={handleInputMaxBedroom}
                  onBlur={handleInputMaxBedroomBlur}
                />
              </div>
            </div>
          </div>
          <div className='flex flex-col items-center gap-4'>
            <Label className='w-full text-left text-sm! font-semibold! text-gray-900!'>
              Bathrooms
            </Label>
            <Slider
              value={[bathroomValues[0] ?? minBathroom, bathroomValues[1] ?? maxBathroom]}
              max={maxBathroom}
              min={minBathroom}
              step={1}
              onValueChange={handleBathroomValueChange}
              className={cn('col-span-3 w-full')}
            />
            <div className='flex w-full items-center justify-between'>
              <div className='flex flex-col gap-1'>
                <Label
                  htmlFor='minBathrooms'
                  className='text-left text-[11px]! font-semibold! text-gray-900!'>
                  Min Bathrooms
                </Label>
                <Input
                  value={
                    bathroomValues[0] === null ? '' : numberFormatInternational(bathroomValues[0])
                  }
                  placeholder='Any'
                  id='minBathrooms'
                  className='w-28'
                  onChange={handleInputMinBathroom}
                  onBlur={handleInputMinBathroomBlur}
                />
              </div>
              <div className='flex flex-col gap-1'>
                <Label
                  htmlFor='maxBathrooms'
                  className='text-left text-[11px]! font-semibold! text-gray-900!'>
                  Max Bathrooms
                </Label>
                <Input
                  value={
                    bathroomValues[1] === null ? '' : numberFormatInternational(bathroomValues[1])
                  }
                  placeholder='Any'
                  id='maxBathrooms'
                  className='w-28'
                  onChange={handleInputMaxBathroom}
                  onBlur={handleInputMaxBathroomBlur}
                />
              </div>
            </div>
          </div>
        </div>
        <SheetFooter className={cn('mt-0 flex flex-col-reverse gap-4 sm:flex-row sm:justify-end')}>
          <Button
            variant={'outlinePrimary'}
            size={'md'}
            className='h-10 drop-shadow-none'
            onClick={resetSearchFilters}>
            Reset
          </Button>
          <Button
            variant={'solidPrimary'}
            size={'md'}
            className='h-10 shadow-none drop-shadow-none'
            onClick={handleAdvancedFilterSearch}>
            View Properties
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
