Feature: Shopping list
  As someone who has planned a week
  I want the planned recipes merged into one shopping list I can tick off
  So that I buy the right amounts in one pass

  Background:
    Given a clean collection

  Scenario: Ingredients merge across the planned recipes
    Given a recipe "r1" with "1 lime" bound to "lime"
    And a recipe "r2" with "1 lime" bound to "lime"
    And recipes "r1, r2" are on the plan for 2
    When I build the shopping list
    Then the list contains "2 limes"

  Scenario: Quantities scale to the plan's portions
    Given a recipe "r1" with "2 garlic" bound to "garlic"
    And recipes "r1" are on the plan for 4
    When I build the shopping list
    Then the list contains "4 garlic cloves"

  Scenario: An unbound ingredient is listed verbatim, not dropped
    Given a recipe "r1" with unbound "mystery herb"
    And recipes "r1" are on the plan for 2
    When I build the shopping list
    Then the unmatched items contain "1 mystery herb"

  Scenario: Binding an unbound ingredient makes it merge
    Given a recipe "r1" with unbound "lime"
    And a recipe "r2" with unbound "lime"
    And recipes "r1, r2" are on the plan for 2
    And I bind "lime" to "lime"
    When I build the shopping list
    Then the list contains "2 limes"
    And the unmatched items do not contain "lime"

  Scenario: Creating a new ingredient and binding to it merges the lines
    Given a recipe "r1" with unbound "gochujang"
    And recipes "r1" are on the plan for 2
    And I create an ingredient "gochujang" in aisle "Pantry" bought in "g"
    And I bind "gochujang" to that new ingredient
    When I build the shopping list
    Then the list has an aisle "Pantry"

  Scenario: Ticking an item off persists
    Given a recipe "r1" with "1 lime" bound to "lime"
    And recipes "r1" are on the plan for 2
    When I tick off "lime|each"
    Then "lime|each" is ticked

  Scenario: A manual extra can be added and removed
    When I add the extra "birthday candles"
    Then the extras contain "birthday candles"
    When I remove extra 0
    Then there are no extras
