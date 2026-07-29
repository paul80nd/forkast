Feature: Related recipes (similar / different)
  As someone viewing a recipe
  I want to see recipes like it and good recipes unlike it
  So that I can dig deeper into a favourite or ring the changes

  Background:
    Given a clean collection

  Scenario: More like this ranks recipes sharing ingredients and cuisine first
    Given the collection has:
      | id       | cuisine | ingredients                 | stars |
      | anchor   | thai    | chicken, coconut milk, lime |       |
      | twin     | thai    | chicken, coconut milk, lime |       |
      | cousin   | thai    | chicken, noodles            |       |
      | stranger | italian | beef, pasta, tomato         |       |
    When I look at related recipes for "anchor"
    Then the "similar" recipes are "twin, cousin, stranger" in that order

  Scenario: Something different offers keepers unlike the anchor, never binned or unrated
    Given the collection has:
      | id            | cuisine | ingredients           | stars |
      | anchor        | thai    | chicken, coconut milk | 5     |
      | greatChange   | italian | beef, pasta           | 5     |
      | binnedChange  | mexican | pork, beans           | 2     |
      | unratedChange | british | sausage, mash         |       |
    When I look at related recipes for "anchor"
    Then the "different" recipes include "greatChange"
    And the "different" recipes exclude "binnedChange, unratedChange"

  Scenario: A recipe's own variant siblings never appear as related
    Given the collection has:
      | id      | cuisine | ingredients   | stars |
      | anchor  | thai    | chicken, rice | 5     |
      | sibling | thai    | beef, rice    | 5     |
      | other   | thai    | chicken, rice | 5     |
    And recipes "anchor, sibling" are a variant group
    When I look at related recipes for "anchor"
    Then the "similar" recipes exclude "sibling"
    And the "different" recipes exclude "sibling"

  Scenario: A no-go recipe never appears as related
    Given the collection has:
      | id     | cuisine | ingredients   | stars | allergens |
      | anchor | thai    | chicken, rice | 5     |           |
      | fishy  | thai    | chicken, rice | 5     | fish      |
    When I look at related recipes for "anchor"
    Then the "similar" recipes exclude "fishy"
