"use client";

import { addPet, deletePet, editPet } from "@/actions/actions";
import { PetEssentials } from "@/lib/types";
import { Pet } from "@prisma/client";
import { createContext, useOptimistic, useState } from "react";
import { toast } from "sonner";

type PetContextProviderProps = {
  data: Pet[];
  children: React.ReactNode;
};

type TPetContext = {
  pets: Pet[];
  selectedPetId: Pet["id"] | null;
  selectedPet: Pet | undefined;
  numberOfPets: number;
  handleAddPet: (newPet: PetEssentials) => Promise<void>;
  handleEditPet: (petId: Pet["id"], newPetData: PetEssentials) => Promise<void>;
  handleCheckoutPet: (petId: Pet["id"]) => Promise<void>;
  handleChangeSelectedPetId: (petId: Pet["id"]) => void;
};

export const PetContext = createContext<TPetContext | null>(null);

export default function PetContextProvider({
  data,
  children,
}: PetContextProviderProps) {
  {
    // state
    // this useOptimistic assumes that the process is successful
    // and updates the ui before the data goes to backend
    const [optimisticPets, setOptimisticPets] = useOptimistic(
      data,
      (state, { action, payload }) => {
        switch (action) {
          case "add":
            return [...state, { ...payload, id: Math.random().toString() }];
          case "edit":
            return state.map((pet) => {
              if (pet.id === payload.petId) {
                return {
                  ...pet,
                  ...payload.newPetData,
                };
              }
              return pet;
            });
          case "delete":
            return state.filter((pet) => pet.id !== payload);
          default:
            return state;
        }
      }
    );
    const [selectedPetId, setSelectedPetId] = useState<string | null>(null);

    // derived state
    const selectedPet = optimisticPets.find((pet) => pet.id === selectedPetId);
    const numberOfPets = optimisticPets.length;

    // event handlers/actions
    const handleAddPet = async (newPet: PetEssentials) => {
      setOptimisticPets({ action: "add", payload: newPet });
      const error = await addPet(newPet);

      if (error) {
        toast.warning(error.message);
        return;
      }
    };

    // edit pet
    const handleEditPet = async (petId: Pet["id"], newPetData: PetEssentials) => {
      setOptimisticPets({ action: "edit", payload: { petId, newPetData } });
      const error = await editPet(petId, newPetData);

      if (error) {
        toast.warning(error.message);
        return;
      }
    };

    // delete specific pet
    const handleCheckoutPet = async (petId: string) => {
      setOptimisticPets({ action: "delete", payload: petId });
      const error = await deletePet(petId);

      if (error) {
        toast.warning(error.message);
        return;
      }

      setSelectedPetId(null); // reset pet id
    };

    const handleChangeSelectedPetId = (id: string) => {
      setSelectedPetId(id);
    };

    return (
      <PetContext.Provider
        value={{
          pets: optimisticPets,
          selectedPetId,
          selectedPet,
          numberOfPets,
          handleChangeSelectedPetId,
          handleAddPet,
          handleEditPet,
          handleCheckoutPet,
        }}
      >
        {children}
      </PetContext.Provider>
    );
  }
}
