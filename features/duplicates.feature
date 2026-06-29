Feature: Find and remove duplicate recipes
  As someone refining my own recipe collection
  I want the app to surface near-identical recipes
  So that I can delete the spares and keep one

  Background:
    Given the app starts with no recipes

  Scenario: Near-identical recipes are flagged as duplicates
    Given a duplicate pair and an unrelated recipe are loaded
    When I scan for duplicates
    Then one duplicate cluster is suggested
    And it holds the duplicate pair

  Scenario: A protein swap is not a duplicate
    Given a chicken version and a beef version of the same dish are loaded
    When I scan for duplicates
    Then no duplicates are suggested

  Scenario: Recipes already in a group are left out
    Given a duplicate pair are loaded
    And the pair are linked in a variant group
    When I scan for duplicates
    Then no duplicates are suggested

  Scenario: Deleting the spares keeps the chosen one
    Given a duplicate pair are loaded
    And I have rated one of them 5 stars
    When I scan for duplicates
    And I delete every member except the keeper
    Then only the kept recipe remains
