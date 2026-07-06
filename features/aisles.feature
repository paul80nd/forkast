Feature: Aisle management
  The shopping list groups by aisle in a saved order. From Config → Ingredients you can add,
  rename, reorder and delete aisles; renaming rewrites the ingredients that sit in them, and the
  order drives the shop's section order.

  Background:
    Given a clean collection

  Scenario: Adding a new aisle appends it to the order
    When I add the aisle "Deli"
    Then the aisle order ends with "Deli"

  Scenario: Renaming an aisle moves its ingredients
    Given an ingredient "gochujang" in aisle "Pantry"
    When I rename the aisle "Pantry" to "Dry goods"
    Then the ingredient "gochujang" is in aisle "Dry goods"
    And the aisle order contains "Dry goods"
    And the aisle order does not contain "Pantry"

  Scenario: Renaming onto an existing aisle merges them
    Given an ingredient "gochujang" in aisle "Pantry"
    And an ingredient "cheddar" in aisle "Dairy"
    When I rename the aisle "Pantry" to "Dairy"
    Then the ingredient "gochujang" is in aisle "Dairy"
    And the aisle order does not contain "Pantry"

  Scenario: An empty aisle can be deleted
    When I add the aisle "Deli"
    And I delete the aisle "Deli"
    Then the aisle order does not contain "Deli"

  Scenario: An aisle in use is protected from deletion
    Given an ingredient "gochujang" in aisle "Pantry"
    When I try to delete the aisle "Pantry"
    Then the aisle order contains "Pantry"

  Scenario: Reordering aisles sets the shopping list section order
    Given a planned recipe "r1" using "100 g cheddar" bound in aisle "Dairy"
    And a planned recipe "r2" using "100 g gochujang" bound in aisle "Pantry"
    When I move the aisle "Pantry" above "Dairy"
    And I build the shopping list
    Then the first aisle on the list is "Pantry"
